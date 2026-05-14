import tempfile


TRAME_TORNADO_SERVER = {}


def patch_trame(base_url: str, instance_id: str, kernel_client_id: str):
    import wslink.backends.tornado.core
    from wslink.backends.generic.core import (
        create_webserver as create_generic_webserver,
    )

    from tornado.websocket import WebSocketHandler
    from tornado.web import StaticFileHandler
    from tornado.web import Application

    class GenericMessage:
        def __init__(self, data):
            self.data = data

    class WsLinkWebSocket(WebSocketHandler):
        def __init__(self, application, request, generic_server=None, **kwargs):
            super().__init__(application, request, **kwargs)
            self._ws = generic_server[generic_server.ws_endpoints[0]]
            self._me = None

        async def on_msg_from_generic(self, binary, content):
            self.write_message(content, binary)

        async def open(self):
            self._me = await self._ws.connect()
            self._me.on_message(self.on_msg_from_generic)

        async def on_message(self, message):
            is_binary = not isinstance(message, str)
            await self._me.send(is_binary, GenericMessage(message))

        def on_close(self):
            self._me.close()

    def patched_create_webserver(server_config):
        # Reverse connection
        if "reverse_url" in server_config:
            msg = "Generic backend does not support reverse_url"
            raise NotImplementedError(msg)

        generic_server = create_generic_webserver(server_config)

        # Handle static content
        www = tempfile.mkdtemp()
        generic_server.write_static_content(www)

        # Tornado specific
        handlers = [
            (rf"{base_url}ws", WsLinkWebSocket, {"generic_server": generic_server}),
            (rf"{base_url}(.*)", StaticFileHandler, {"path": www}),
        ]

        application = Application(handlers)
        TRAME_TORNADO_SERVER[f"{instance_id}@{kernel_client_id}"] = application

        return generic_server

    wslink.backends.tornado.core.create_webserver = patched_create_webserver
    wslink.backends.tornado.create_webserver = patched_create_webserver


def get_trame_server(instance_id: str, kernel_client_id: str):
    return TRAME_TORNADO_SERVER.get(f"{instance_id}@{kernel_client_id}", None)
