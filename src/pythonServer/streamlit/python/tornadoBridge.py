import asyncio
import logging
import tornado

from tornado.http1connection import HTTP1Connection, HTTP1ConnectionParameters
from tornado.iostream import BaseIOStream, IOStream
from tornado.httputil import HTTPHeaders, RequestStartLine, HTTPServerRequest
from typing import Dict, List, Optional, Tuple


WEBSOCKET_PREFIX = "/_jupyterpack_ws"
APP_PREFIX = "/_jupyterpack_app"


logger = logging.getLogger(__name__)
logger.setLevel(logging.WARN)


def convert_headers(
    headers: List[Tuple[str, str]],
) -> HTTPHeaders:
    tornado_headers = HTTPHeaders()
    for k, v in headers:
        tornado_headers.add(k, v)
    return tornado_headers


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
        if isinstance(self._reply_body, bytes):
            return self._reply_body.decode("utf-8")
        return self._reply_body

    @property
    def reply_headers(self):
        return self._reply_headers

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
        if initial_request_data:
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
        if chunk:
            self._connection_state.append_reply_body(chunk)
        f = asyncio.Future()
        f.set_result(None)
        return f

    def finish(self):
        self._connection_state.finish()


class TornadoBridge:
    """
    Encapsulates Tornado app lifecycle, request/response bridging, and WebSocket handling.
    """

    def __init__(self, tornado_app: tornado.web.Application, base_url: str):
        self.base_url = base_url
        self.tornado_app = tornado_app
        self.websocket_handlers: Dict[str, tornado.websocket.WebSocketHandler] = {}
        self._patched = False

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

        handler = self.tornado_app.find_handler(request)
        handler.execute()
        connection_state = connection.connection_state
        await connection_state.finish_future

        return (
            connection_state.reply_body,
            connection_state.reply_headers,
            connection_state.status,
        )
