import os

from aiohttp.abc import AbstractStreamWriter
from io import BytesIO
import asyncio
from typing import Final, Tuple

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
