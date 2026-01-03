"""
Adapted from https://github.com/davidbrochart/ipytextual/blob/main/ipytextual/driver.py

"""

from __future__ import annotations

import asyncio
import json
from codecs import getincrementaldecoder

from textual import events, log, messages
from textual._xterm_parser import XTermParser
from textual.app import App
from textual.driver import Driver as _Driver
from textual.geometry import Size
from textual.drivers._byte_stream import ByteStream

SIZE = [None, None]


class _ExitInput(Exception):
    """Internal exception to force exit of input loop."""


class JupyterPackDriver(_Driver):
    """A Wasm-friendly headless driver for JupyterPack bridge."""

    def __init__(
        self,
        app: App,
        *,
        debug: bool = False,
        mouse: bool = True,
        size: tuple[int, int] | None = None,
    ):
        if size is None and SIZE[0] is not None:
            size = SIZE[0], SIZE[1]

        super().__init__(app, debug=debug, mouse=mouse, size=size)

        self.exit_event = asyncio.Event()
        self._stdout_queue: asyncio.Queue[bytes] = asyncio.Queue()
        self._stdin_queue: asyncio.Queue[bytes] = asyncio.Queue()
        self._process_input_task = asyncio.create_task(self.process_input())

    @property
    def stdin_queue(self) -> asyncio.Queue:
        return self._stdin_queue

    @property
    def stdout_queue(self) -> asyncio.Queue:
        return self._stdout_queue

    def write(self, data: str) -> None:
        """Write string data to stdout queue (for bridge)."""
        data_bytes = data.encode("utf-8")
        self._stdout_queue.put_nowait(
            b"D%s%s" % (len(data_bytes).to_bytes(4, "big"), data_bytes)
        )

    def write_meta(self, data: dict) -> None:
        """Write meta information to stdout queue (for bridge)."""
        meta_bytes = json.dumps(data).encode("utf-8", errors="ignore")
        self._stdout_queue.put_nowait(
            b"M%s%s" % (len(meta_bytes).to_bytes(4, "big"), meta_bytes)
        )

    def flush(self) -> None:
        pass

    def _enable_mouse_support(self) -> None:
        self.write("\x1b[?1000h")
        self.write("\x1b[?1003h")
        self.write("\x1b[?1015h")
        self.write("\x1b[?1006h")

    def _disable_mouse_support(self) -> None:
        self.write("\x1b[?1000l")
        self.write("\x1b[?1003l")
        self.write("\x1b[?1015l")
        self.write("\x1b[?1006l")

    def _enable_bracketed_paste(self) -> None:
        self.write("\x1b[?2004h")

    def _disable_bracketed_paste(self) -> None:
        self.write("\x1b[?2004l")

    def _request_terminal_sync_mode_support(self) -> None:
        self.write("\033[?2026$p")

    def exit_app(self) -> asyncio.Future:
        future = asyncio.run_coroutine_threadsafe(
            self._app._post_message(messages.ExitApp()), loop=asyncio.get_running_loop()
        )
        return future

    def start_application_mode(self) -> None:
        """Start app mode in WASM environment."""

        loop = asyncio.get_running_loop()

        self._stdout_queue.put_nowait(b"__GANGLION__\n")

        self.write("\x1b[?1049h")  # Alt screen
        self._enable_mouse_support()

        self.write("\x1b[?25l")  # Hide cursor
        self._enable_bracketed_paste()

        size = Size(80, 24) if self._size is None else Size(*self._size)
        event = events.Resize(size, size)

        asyncio.run_coroutine_threadsafe(
            self._app._post_message(event),
            loop=loop,
        )

        self._request_terminal_sync_mode_support()
        self._enable_bracketed_paste()

    def disable_input(self) -> None:
        """Disable further input."""
        pass

    def stop_application_mode(self) -> None:
        """Stop app mode."""
        self.exit_event.set()
        self.write_meta({"type": "exit"})

    async def process_input(self) -> None:
        """Process incoming stdin messages from the bridge."""

        def more_data():
            return not self._stdin_queue.empty()

        parser = XTermParser(more_data, debug=self._debug)
        decode = getincrementaldecoder("utf-8")().decode
        byte_stream = ByteStream()

        try:
            while True:
                data = await self._stdin_queue.get()
                for packet_type, payload in byte_stream.feed(data):
                    if packet_type == "D":
                        for event in parser.feed(decode(payload)):
                            self.process_message(event)
                    else:
                        self._on_meta(packet_type, payload)
        except _ExitInput:
            pass
        except Exception:
            from traceback import format_exc

            log(format_exc())
        finally:
            self._process_input_task.cancel()

    def _on_meta(self, packet_type: str, payload: bytes) -> None:
        payload_map = json.loads(payload)
        _type = payload_map.get("type")
        if isinstance(payload_map, dict):
            self.on_meta(_type, payload_map)

    def on_meta(self, packet_type: str, payload: dict) -> None:
        if packet_type == "resize":
            self._size = (payload["width"], payload["height"])
            size = Size(*self._size)
            self._app.post_message(events.Resize(size, size))
        elif packet_type == "quit":
            self._app.post_message(messages.ExitApp())
        elif packet_type in {"quit", "exit"}:
            raise _ExitInput()
