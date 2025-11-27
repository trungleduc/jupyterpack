import base64
import logging
from typing import Dict

import tornado
from tornado.httputil import HTTPServerRequest
from tornado.websocket import WebSocketHandler

from jupyterpack.common import (
    BaseBridge,
    decode_broadcast_message,
    encode_broadcast_message,
    generate_broadcast_channel_name,
)
from jupyterpack.js import BroadcastChannel

from .patchedConnection import PatchedConnection
from .tools import DumpStream, convert_headers
from .wsConnection import WSConnection

logger = logging.getLogger(__name__)
logger.setLevel(logging.WARN)

# Keep track of all broadcast channels outside of the TornadoBridge
# so that reloading the tornado server does not create duplicated
# broadcast channels
ALL_BROADCAST_CHANNEL: Dict[str, BroadcastChannel] = {}


class TornadoBridge(BaseBridge):
    """
    Encapsulates Tornado app lifecycle, request/response bridging, and WebSocket handling.
    """

    def __init__(self, tornado_app: tornado.web.Application, base_url: str):
        self.base_url = base_url
        self.tornado_app = tornado_app
        self.websocket_handlers: Dict[str, tornado.websocket.WebSocketHandler] = {}
        self._ws_handlers = {}

    async def fetch(self, request: Dict):
        """
        request: {body: Optional[bytes], headers: List[Tuple[str, str]], method: str, url: str}
        """

        request_headers = convert_headers(request.get("headers", []))
        request_method = request.get("method", "GET").upper()
        request_url: str = request.get("url", "/")

        request_body = request.get("body", None)
        stream = DumpStream()

        connection = PatchedConnection(
            stream,
            is_client=False,
            params=None,
            context=None,
            initial_request_data={
                "request_method": request_method,
                "request_url": request_url,
            },
        )

        request = HTTPServerRequest(
            method=request_method,
            uri=request_url,
            headers=request_headers,
            body=request_body,
            connection=connection,
        )

        try:
            handler = self.tornado_app.find_handler(request)
            handler.execute()
            connection_state = connection.connection_state
            await connection_state.finish_future
            return {
                "content": connection_state.reply_body,
                "headers": connection_state.reply_headers,
                "status_code": connection_state.status,
            }
        except Exception as e:
            return {
                "headers": "e30=",  # {}
                "content": base64.b64encode(str(e).encode("utf-8")).decode("ascii"),
                "status_code": 500,
            }

    async def open_ws(
        self,
        instance_id: str,
        kernel_client_id: str,
        ws_url: str,
        protocols_str: str | None,
    ):
        handler_key = f"{instance_id}@{kernel_client_id}@{ws_url}"
        broadcast_channel_key = generate_broadcast_channel_name(
            instance_id, kernel_client_id
        )
        broadcast_channel = ALL_BROADCAST_CHANNEL.get(broadcast_channel_key, None)

        if broadcast_channel is None:
            broadcast_channel = BroadcastChannel(broadcast_channel_key)
            ALL_BROADCAST_CHANNEL[broadcast_channel_key] = broadcast_channel

        headers = convert_headers(
            [
                ("X-Sec-WebSocket-Protocol", protocols_str),
                ("Upgrade", "websocket"),
                ("Connection", "Upgrade"),
                ("Sec-WebSocket-Key", ""),
                ("Sec-WebSocket-Version", "13"),
            ]
        )
        protocols = []
        if protocols_str is not None:
            protocols = protocols_str.split(",")

        stream = DumpStream()
        ws_connection = WSConnection(
            instance_id, kernel_client_id, ws_url, broadcast_channel
        )
        connection = PatchedConnection(
            stream,
            is_client=False,
            params=None,
            context=None,
            initial_request_data={
                "request_method": "GET",
                "request_url": ws_url,
            },
        )

        request = tornado.httputil.HTTPServerRequest(
            method="GET",
            uri=ws_url,
            headers=headers,
            body=None,
            connection=connection,
        )

        handler = self.tornado_app.find_handler(request)
        ret = handler.execute()
        if ret is not None:
            await ret
        connection_state = connection.connection_state
        await connection_state.finish_future

        if isinstance(handler.handler, WebSocketHandler):
            handler.handler.select_subprotocol(protocols)
            handler.handler.ws_connection = ws_connection
            ret = handler.handler.open(
                *handler.handler.open_args, **handler.handler.open_kwargs
            )
            if ret is not None:
                try:
                    await ret
                except Exception:
                    raise ("Failed to open websocket")

        self._ws_handlers[handler_key] = handler

        self.send_ws_message_to_js(
            instance_id, kernel_client_id, ws_url, "", "connected"
        )

    async def close_ws(self, instance_id: str, kernel_client_id: str, ws_url: str):
        handler_key = f"{instance_id}@{kernel_client_id}@{ws_url}"
        self._ws_handlers.pop(handler_key, None)

    def send_ws_message_to_js(
        self,
        instance_id: str,
        kernel_client_id: str,
        ws_url: str,
        msg: str | bytes,
        action: str = "backend_message",
    ):
        broadcast_channel_key = generate_broadcast_channel_name(
            instance_id, kernel_client_id
        )
        broadcast_channel = ALL_BROADCAST_CHANNEL.get(broadcast_channel_key, None)
        if broadcast_channel is not None:
            broadcast_channel.postMessage(
                encode_broadcast_message(kernel_client_id, ws_url, msg, action)
            )

    async def receive_ws_message_from_js(
        self, instance_id: str, kernel_client_id: str, ws_url: str, payload_message: str
    ):
        handler_key = f"{instance_id}@{kernel_client_id}@{ws_url}"
        handler = self._ws_handlers.get(handler_key, None)
        if handler is not None:
            data = decode_broadcast_message(payload_message)
            future = handler.handler.on_message(data)
            if future is not None:
                await future
