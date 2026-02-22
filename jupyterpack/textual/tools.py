import asyncio
import inspect
import os
from io import BytesIO
from typing import Any, Final, Tuple
from unittest import mock

from aiohttp import hdrs
from aiohttp.abc import AbstractStreamWriter
from aiohttp.helpers import sentinel
from aiohttp.http import HttpVersion, RawRequestMessage
from aiohttp.streams import EMPTY_PAYLOAD
from aiohttp.web import Request, UrlMappingMatchInfo
from multidict import CIMultiDict, CIMultiDictProxy
from yarl import URL

# Textual Protocol Constants
META: Final[bytes] = b"M"
DATA: Final[bytes] = b"D"
PACKED: Final[bytes] = b"P"


class MemoryWriter(AbstractStreamWriter):
    def __init__(self):
        self.buf = BytesIO()
        self.status_line = None
        self.headers = None

    async def write_headers(self, status_line, headers):
        self.status_line = status_line
        self.headers = dict(headers)

    async def write(self, data):
        self.buf.write(data)

    async def write_eof(self, data=b""):
        if data:
            self.buf.write(data)

    async def drain(self):
        pass

    def enable_chunking(self):
        pass

    def enable_compression(self, *args, **kwargs):
        pass


def patch_textual():
    if not hasattr(asyncio.tasks, "_set_task_name"):
        asyncio.tasks._set_task_name = lambda task, name: None
    from textual import constants

    constants.DRIVER = "jupyterpack.textual.textualDriver:JupyterPackDriver"
    os.environ["TEXTUAL_DRIVER"] = constants.DRIVER
    os.environ["TEXTUAL_FPS"] = "60"
    os.environ["TEXTUAL_COLOR_SYSTEM"] = "truecolor"
    os.environ["TERM_PROGRAM"] = "textual"
    os.environ["TERM_PROGRAM_VERSION"] = "0.0.1"
    os.environ["COLUMNS"] = "80"
    os.environ["ROWS"] = "24"


def serialize_packet(packet_type: bytes, payload: bytes) -> bytes:
    """
    Encapsulate the protocol format: Type (1b) + Size (4b) + Payload.
    packet_type is expected to be raw bytes (DATA/META).
    """
    size_bytes = len(payload).to_bytes(4, "big")

    return b"%s%s%s" % (packet_type, size_bytes, payload)


def deserialize_packet(data: bytes) -> Tuple[bytes]:
    """
    Decapsulate the protocol format: Type (1b) + Size (4b) + Payload.
    """
    if len(data) < 5:
        raise ValueError("Invalid packet size")
    packet_type = data[0:1]
    size = int.from_bytes(data[1:5], "big")
    if len(data) < 5 + size:
        raise ValueError("Invalid packet size")
    payload = data[5 : 5 + size]
    return packet_type, payload


def _create_transport(sslcontext=None) -> mock.Mock:
    transport = mock.Mock()

    def get_extra_info(key: str):
        if key == "sslcontext":
            return sslcontext
        else:
            return None

    transport.get_extra_info.side_effect = get_extra_info
    return transport


def make_mocked_coro(
    return_value: Any = sentinel, raise_exception: Any = sentinel
) -> Any:
    """Creates a coroutine mock."""

    async def mock_coro(*args: Any, **kwargs: Any) -> Any:
        if raise_exception is not sentinel:
            raise raise_exception
        if not inspect.isawaitable(return_value):
            return return_value
        await return_value

    return mock.Mock(wraps=mock_coro)


def make_mocked_request(
    method: str,
    path: str,
    headers: Any = None,
    *,
    match_info: Any = sentinel,
    version: HttpVersion = HttpVersion(1, 1),
    closing: bool = False,
    app: Any = None,
    writer: Any = sentinel,
    protocol: Any = sentinel,
    transport: Any = sentinel,
    payload=EMPTY_PAYLOAD,
    sslcontext=None,
    client_max_size: int = 1024**2,
    loop: Any = ...,
):
    """Creates mocked web.Request testing purposes.

    Useful in unit tests, when spinning full web server is overkill or
    specific conditions and errors are hard to trigger.
    """
    task = mock.Mock()
    if loop is ...:
        # no loop passed, try to get the current one if
        # its is running as we need a real loop to create
        # executor jobs to be able to do testing
        # with a real executor
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = mock.Mock()
            loop.create_future.return_value = ()

    if version < HttpVersion(1, 1):
        closing = True

    if headers:
        headers = CIMultiDictProxy(CIMultiDict(headers))
        raw_hdrs = tuple(
            (k.encode("utf-8"), v.encode("utf-8")) for k, v in headers.items()
        )
    else:
        headers = CIMultiDictProxy(CIMultiDict())
        raw_hdrs = ()

    chunked = "chunked" in headers.get(hdrs.TRANSFER_ENCODING, "").lower()

    message = RawRequestMessage(
        method,
        path,
        version,
        headers,
        raw_hdrs,
        closing,
        None,
        False,
        chunked,
        URL(path),
    )
    if app is None:
        raise Exception("app is None")

    if transport is sentinel:
        transport = _create_transport(sslcontext)

    if protocol is sentinel:
        protocol = mock.Mock()
        protocol.transport = transport
        type(protocol).peername = mock.PropertyMock(
            return_value=transport.get_extra_info("peername")
        )
        type(protocol).ssl_context = mock.PropertyMock(return_value=sslcontext)

    if writer is sentinel:
        writer = mock.Mock()
        writer.write_headers = make_mocked_coro(None)
        writer.write = make_mocked_coro(None)
        writer.write_eof = make_mocked_coro(None)
        writer.drain = make_mocked_coro(None)
        writer.transport = transport

    protocol.transport = transport
    protocol.writer = writer

    req = Request(
        message, payload, protocol, writer, task, loop, client_max_size=client_max_size
    )

    match_info = UrlMappingMatchInfo(
        {} if match_info is sentinel else match_info, mock.Mock()
    )
    match_info.add_app(app)
    req._match_info = match_info

    return req
