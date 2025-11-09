import asyncio
import base64
import json
from typing import List, Optional, Tuple


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
