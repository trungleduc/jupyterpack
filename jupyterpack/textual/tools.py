import os

from aiohttp.abc import AbstractStreamWriter
from io import BytesIO
import asyncio


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

    constants.DRIVER = "jupyterpack.textual.driver:JupyterPackDriver"
    os.environ["TEXTUAL_DRIVER"] = constants.DRIVER
    os.environ["TEXTUAL_FPS"] = "60"
    os.environ["TEXTUAL_COLOR_SYSTEM"] = "truecolor"
    os.environ["TERM_PROGRAM"] = "textual"
    os.environ["TERM_PROGRAM_VERSION"] = "0.0.1"
    os.environ["COLUMNS"] = "80"
    os.environ["ROWS"] = "24"
