import asyncio
from tornado.http1connection import HTTP1Connection, HTTP1ConnectionParameters
from tornado.iostream import IOStream
from tornado.httputil import RequestStartLine
from typing import Dict, Optional

from .connectionState import ConnectionState


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
