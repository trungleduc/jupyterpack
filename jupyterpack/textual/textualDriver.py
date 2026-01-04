"""
Adapted from https://github.com/davidbrochart/ipytextual/blob/main/ipytextual/driver.py
"""

from __future__ import annotations

import asyncio
import json
from codecs import getincrementaldecoder
from typing import Final, Tuple

from textual import events, messages
from textual.app import App
from textual.driver import Driver as TextualDriver
from textual.drivers._byte_stream import ByteStream
from textual.geometry import Size
from textual._xterm_parser import XTermParser

from jupyterpack.js import js_log
from .tools import DATA, META, serialize_packet


# Terminal Escape Sequences
SEQ_MOUSE_ON: Final[Tuple[str]] = (
    "\x1b[?1000h",
    "\x1b[?1003h",
    "\x1b[?1015h",
    "\x1b[?1006h",
)
SEQ_MOUSE_OFF: Final[Tuple[str]] = (
    "\x1b[?1000l",
    "\x1b[?1003l",
    "\x1b[?1015l",
    "\x1b[?1006l",
)
SEQ_PASTE_ON: Final[str] = "\x1b[?2004h"
SEQ_PASTE_OFF: Final[str] = "\x1b[?2004l"
SEQ_ALT_SCREEN: Final[str] = "\x1b[?1049h"
SEQ_HIDE_CURSOR: Final[str] = "\x1b[?25l"
SEQ_SYNC_QUERY: Final[str] = "\033[?2026$p"
SEQ_HANDSHAKE: Final[bytes] = b"__GANGLION__\n"


class InputLoopExit(Exception):
    """Signal to exit the input processing loop."""


class JupyterPackDriver(TextualDriver):
    """
    A specific driver for bridging Textual Apps to Jupyter/Wasm environments.
    """

    def __init__(
        self,
        app: App,
        *,
        debug: bool = False,
        mouse: bool = True,
        size: tuple[int, int] | None = None,
    ):
        initial_size = size or (80, 24)
        super().__init__(app, debug=debug, mouse=mouse, size=initial_size)

        self._exit_event = asyncio.Event()
        self._stdout_queue: asyncio.Queue[bytes] = asyncio.Queue()
        self._stdin_queue: asyncio.Queue[bytes] = asyncio.Queue()

        # Start the input processor immediately

        self._process_input_task = asyncio.create_task(self._run_input_loop())

    @property
    def stdin_queue(self) -> asyncio.Queue:
        return self._stdin_queue

    @property
    def stdout_queue(self) -> asyncio.Queue:
        return self._stdout_queue

    def write(self, data: str) -> None:
        """Queue raw string data to be sent to the frontend."""
        packet = serialize_packet(DATA, data.encode("utf-8"))
        self._stdout_queue.put_nowait(packet)

    def write_meta(self, data: dict) -> None:
        """Queue metadata (JSON) to be sent to the frontend."""
        json_bytes = json.dumps(data).encode("utf-8", errors="ignore")
        packet = serialize_packet(META, json_bytes)
        self._stdout_queue.put_nowait(packet)

    def flush(self) -> None:
        pass

    def _enable_mouse_support(self) -> None:
        for data in SEQ_MOUSE_ON:
            self.write(data)

    def _disable_mouse_support(self) -> None:
        for data in SEQ_MOUSE_OFF:
            self.write(data)

    def _enable_bracketed_paste(self) -> None:
        self.write(SEQ_PASTE_ON)

    def _disable_bracketed_paste(self) -> None:
        self.write(SEQ_PASTE_OFF)

    def _request_terminal_sync_mode_support(self) -> None:
        self.write(SEQ_SYNC_QUERY)

    def exit_app(self) -> asyncio.Future:
        future = asyncio.run_coroutine_threadsafe(
            self._app._post_message(messages.ExitApp()), loop=asyncio.get_running_loop()
        )
        self._process_input_task.cancel()
        return future

    def start_application_mode(self) -> None:
        """Initialize the terminal state for the application."""
        # Send handshake
        self._stdout_queue.put_nowait(SEQ_HANDSHAKE)

        self.write(SEQ_ALT_SCREEN)
        self._enable_mouse_support()
        self.write(SEQ_HIDE_CURSOR)
        self._enable_bracketed_paste()

        # Notify app of initial size
        target_size = Size(*self._size) if self._size else Size(80, 24)
        asyncio.run_coroutine_threadsafe(
            self._app._post_message(events.Resize(target_size, target_size)),
            loop=asyncio.get_running_loop(),
        )

        self._request_terminal_sync_mode_support()
        self._enable_bracketed_paste()

    def stop_application_mode(self) -> None:
        """Teardown application mode."""
        self._exit_event.set()
        self.write_meta({"type": "exit"})

    def disable_input(self) -> None:
        pass

    async def _run_input_loop(self) -> None:
        """Continuous loop processing incoming stream data."""

        parser = XTermParser(debug=self._debug)
        decode = getincrementaldecoder("utf-8")().decode
        stream_processor = ByteStream()

        data_header_str = DATA.decode("ascii")

        try:
            while True:
                chunk = await self._stdin_queue.get()
                for packet_type, payload in stream_processor.feed(chunk):
                    if packet_type == data_header_str:
                        # packet_type is a string here (e.g., "D")
                        for event in parser.feed(decode(payload)):
                            self.process_message(event)
                    else:
                        # Meta packet (e.g., "M")
                        self._on_meta(packet_type, payload)

        except InputLoopExit:
            pass
        except Exception as e:
            js_log(f"Exception in input loop {e}")
        finally:
            self._process_input_task.cancel()

    def _on_meta(self, packet_type: str, payload: bytes) -> None:
        """Process meta message coming from the frontend websocket."""
        payload_map = json.loads(payload)
        payload_type = payload_map.get("type")
        if isinstance(payload_type, str) and isinstance(payload_map, dict):
            self.on_meta(payload_type, payload_map)
        else:
            js_log(
                f"Protocol error: type field value is not a string. Value is {type(payload_type)}"
            )

    def on_meta(self, payload_type: str, payload: dict) -> None:
        if payload_type == "resize":
            self._size = (payload["width"], payload["height"])
            size = Size(*self._size)
            self._app.post_message(events.Resize(size, size))
        elif payload_type == "quit":
            self._app.post_message(messages.ExitApp())
        elif payload_type == "focus":
            self._app.post_message(events.AppFocus())
        elif payload_type == "blur":
            self._app.post_message(events.AppBlur())
        elif payload_type in {"quit", "exit"}:
            raise InputLoopExit()
