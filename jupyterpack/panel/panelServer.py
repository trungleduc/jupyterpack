import tornado

from ..tornado.tornadoServer import TornadoServer


async def create_panel_app(script_path: str, base_url: str):
    from panel.io.server import get_server

    tor_app = get_server(script_path, prefix=base_url)

    return tor_app._tornado


class PanelServer(TornadoServer):
    def __init__(self, tornado_app: tornado.web.Application, base_url: str):
        super().__init__(tornado_app, base_url)

    def dispose(self):
        super().dispose()

    def reload(self, tornado_app: tornado.web.Application):
        return super().reload(tornado_app)
