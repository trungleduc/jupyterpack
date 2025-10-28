import asyncio
import base64
import json
import logging
import tornado

from tornado.http1connection import HTTP1Connection, HTTP1ConnectionParameters
from tornado.iostream import BaseIOStream, IOStream
from tornado.httputil import HTTPHeaders, RequestStartLine, HTTPServerRequest
from tornado.websocket import WebSocketHandler
import tornado.escape
import pyjs
from typing import Any, Dict, List, Optional, Tuple


logger = logging.getLogger(__name__)
logger.setLevel(logging.WARN)


def convert_headers(
    headers: List[Tuple[str, str]],
) -> HTTPHeaders:
    tornado_headers = HTTPHeaders()
    for k, v in headers:
        tornado_headers.add(k, v)
    return tornado_headers


def encode_broadcast_message(
    kernel_client_id: str,
    ws_url: str,
    msg: str | bytes,
    action: str = "backend_message",
):
    if isinstance(msg, bytes):
        is_binary = True
        b64_msg = base64.b64encode(msg).decode("ascii")
    elif isinstance(msg, str):
        is_binary = False
        b64_msg = msg

    return json.dumps(
        {
            "action": action,
            "dest": kernel_client_id,
            "wsUrl": ws_url,
            "payload": {"isBinary": is_binary, "data": b64_msg},
        }
    )


def decode_broadcast_message(payload_message: str):
    msg_object = json.loads(payload_message)
    is_binary = msg_object["isBinary"]
    data = msg_object["data"]
    if is_binary:
        return base64.b64decode(data)
    else:
        return data


class DumpStream(BaseIOStream):
    max_buffer_size = 1048576000

    def close_fd(*args, **kwargs):
        pass

    def write_to_fd(self, buf):
        raise NotImplementedError("Not supported!")


class ConnectionState:
    def __init__(self):
        self._reply_body = b""
        self._finish_future = asyncio.Future()
        self._reply_headers = []
        self._status: Optional[int] = None

    @property
    def reply_body(self):
        return base64.b64encode(self._reply_body).decode("ascii")

    @property
    def reply_headers(self):
        reply_headers = json.dumps(dict(self._reply_headers)).encode("utf-8")
        return base64.b64encode(reply_headers).decode("ascii")

    @property
    def status(self):
        return self._status

    @property
    def finish_future(self):
        return self._finish_future

    def append_reply_body(self, chunk: bytes):
        self._reply_body += chunk

    def append_reply_header(self, headers: List[Tuple[str, str]]):
        self._reply_headers.extend(headers)

    def set_status(self, status: int):
        self._status = status

    def finish(self):
        self._finish_future.set_result(None)


class PatchedConnection(HTTP1Connection):
    def __init__(
        self,
        stream: IOStream,
        is_client: bool,
        params: Optional[HTTP1ConnectionParameters] = None,
        context: Optional[object] = None,
        initial_request_data: Optional[Dict] = None,
    ) -> None:
        super().__init__(stream, is_client, params, context)
        self._connection_state = ConnectionState()
        if initial_request_data is not None:
            self._request_start_line = RequestStartLine(
                initial_request_data.get("request_method"),
                initial_request_data.get("request_url"),
                "HTTP/1.1",
            )

    @property
    def connection_state(self):
        return self._connection_state

    def write(self, chunk: bytes):
        self._connection_state.append_reply_body(chunk)
        f = asyncio.Future()
        f.set_result(None)
        return f

    def write_headers(self, start_line, headers, chunk=None):
        self._connection_state.set_status(int(start_line.code))
        self._connection_state.append_reply_header(headers.get_all())
        if chunk is not None:
            self._connection_state.append_reply_body(chunk)
        f = asyncio.Future()
        f.set_result(None)
        return f

    def finish(self):
        self._connection_state.finish()


class WSConnection:
    def __init__(
        self,
        instance_id: str,
        kernel_client_id: str,
        ws_url: str,
        broadcast_channel: Any,
    ):
        self.instance_id = instance_id
        self.kernel_client_id = kernel_client_id
        self.ws_url = ws_url
        self.broadcast_channel = broadcast_channel

    client_terminated = False

    def is_closing(self):
        return False

    def write_message(self, msg, binary=False):
        if isinstance(msg, dict):
            msg = tornado.escape.json_encode(msg)
        self.broadcast_channel.postMessage(
            encode_broadcast_message(self.kernel_client_id, self.ws_url, msg)
        )
        f = asyncio.Future()
        f.set_result(None)
        return f

    def write_ping(self, data):
        pass

    def close(self, code, reason=None):
        pass


class TornadoBridge:
    """
    Encapsulates Tornado app lifecycle, request/response bridging, and WebSocket handling.
    """

    def __init__(self, tornado_app: tornado.web.Application, base_url: str):
        self.base_url = base_url
        self.tornado_app = tornado_app
        self.websocket_handlers: Dict[str, tornado.websocket.WebSocketHandler] = {}
        self._patched = False
        self._ws_handlers = {}
        self._ws_broadcast_channels = {}

    # ---------------------------
    # Fetch Handling
    # ---------------------------

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

    # ---------------------------
    # Websocket Handling
    # ---------------------------
    async def open_ws(
        self,
        instance_id: str,
        kernel_client_id: str,
        ws_url: str,
        protocols_str: str | None,
    ):
        handler_key = f"{instance_id}@{kernel_client_id}@{ws_url}"
        broadcast_channel = self._ws_broadcast_channels.get(handler_key, None)

        if broadcast_channel is None:
            broadcast_channel = pyjs.js.BroadcastChannel.new(
                f"/jupyterpack/ws/{instance_id}"
            )
            self._ws_broadcast_channels[handler_key] = broadcast_channel

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

    def send_ws_message_to_js(
        self,
        instance_id: str,
        kernel_client_id: str,
        ws_url: str,
        msg: str | bytes,
        action: str = "backend_message",
    ):
        handler_key = f"{instance_id}@{kernel_client_id}@{ws_url}"
        broadcast_channel = self._ws_broadcast_channels.get(handler_key, None)
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
