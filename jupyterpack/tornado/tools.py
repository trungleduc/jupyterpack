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



class DumpStream(BaseIOStream):
    max_buffer_size = 1048576000

    def close_fd(*args, **kwargs):
        pass

    def write_to_fd(self, buf):
        raise NotImplementedError("Not supported!")


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
