import asyncio
import base64
import json
from textual_serve.server import Server
from typing import Dict, List, Optional
from aiohttp.test_utils import make_mocked_request
from jupyterpack.common import BaseBridge
from .textualDriver import JupyterPackDriver
from ..common.tools import (
    decode_broadcast_message,
    encode_broadcast_message,
    generate_broadcast_channel_name,
)
from .tools import DATA, META, MemoryWriter, deserialize_packet, serialize_packet
from jupyterpack.js import BroadcastChannel, js_log

ALL_BROADCAST_CHANNEL: Dict[str, BroadcastChannel] = {}


class TextualBridge(BaseBridge):
    def __init__(self, textual_app, base_url: str):
        self.base_url = base_url
        self._textual_app = textual_app
        self._tasks: List[asyncio.Task] = []
        self._public_url = "http://" + f"127.0.0.1:8448/{base_url}".replace(
            "//", "/"
        ).removesuffix("/")

        self._textual_server = Server("", public_url=self._public_url)
        self._temp_app = None
        self._driver: Optional[JupyterPackDriver] = None
        self._ready_event = asyncio.Event()
        self._broastcast_channel_keymap = {}

    def dispose(self):
        self._driver.exit_app()
        for t in self._tasks:
            t.cancel()
        self._tasks = []

    async def fetch(self, request: Dict):
        """
        request: {body: Optional[bytes], headers: List[Tuple[str, str]], method: str, url: str}
        """
        method = request.get("method", "GET").upper()
        url: str = request.get("url", "/")
        resquest_headers = dict(request.get("headers", []))
        if self._temp_app is None:
            self._temp_app = await self._textual_server._make_app()
            self._temp_app.freeze()

        if url.startswith(self._public_url):
            rel_path = url.replace(self._public_url, "")
        elif url.startswith(self.base_url):
            rel_path = url.replace(self.base_url, "")
            if len(rel_path) == 0:
                rel_path = "/"
        else:
            rel_path = url
        if not rel_path.startswith("/"):
            rel_path = "/" + rel_path

        writer = MemoryWriter()
        req = make_mocked_request(
            method,
            rel_path,
            headers=resquest_headers,
            app=self._temp_app,
            writer=writer,
        )
        res = None
        if rel_path == "/":
            index = await self._textual_server.handle_index(req)
            res = {"headers": index.headers, "body": index.body, "status": index.status}
        elif rel_path.startswith("/static"):
            static = await self._temp_app._handle(req)
            await static.prepare(req)
            await static.write_eof()
            res = {
                "headers": static.headers,
                "body": writer.buf.getvalue(),
                "status": static.status,
            }

        if res is not None:
            headers_json = json.dumps(dict(res["headers"])).encode("utf-8")
            headers_b64 = base64.b64encode(headers_json).decode("ascii")
            content_b64 = base64.b64encode(res["body"]).decode("ascii")
            return {
                "headers": headers_b64,
                "content": content_b64,
                "status_code": res["status"],
            }
        else:
            return {
                "headers": "e30=",  # {}
                "content": base64.b64encode("Missing response".encode()).decode(
                    "ascii"
                ),
                "status_code": 500,
            }

    async def open_ws(
        self,
        instance_id: str,
        kernel_client_id: str,
        ws_url: str,
        protocols_str: str | None,
        broadcast_channel_suffix: str | None,
        **kwargs,
    ):
        handler_key = f"{instance_id}@{kernel_client_id}@{ws_url}"

        broadcast_channel_key = generate_broadcast_channel_name(
            instance_id, kernel_client_id, broadcast_channel_suffix
        )
        self._broastcast_channel_keymap[handler_key] = broadcast_channel_suffix
        broadcast_channel = ALL_BROADCAST_CHANNEL.get(broadcast_channel_key, None)

        if broadcast_channel is None:
            broadcast_channel = BroadcastChannel(broadcast_channel_key)
            ALL_BROADCAST_CHANNEL[broadcast_channel_key] = broadcast_channel

        run_task = asyncio.create_task(
            self._run(instance_id, kernel_client_id, ws_url, broadcast_channel_suffix)
        )
        self._tasks.append(run_task)

        send_data_task = asyncio.create_task(
            self._send_textual_data_to_frontend(
                instance_id, kernel_client_id, ws_url, broadcast_channel_suffix
            )
        )

        self._tasks.append(send_data_task)

    async def close_ws(self, *args, **kwargs):
        for task in self._tasks:
            task.cancel()
        self._tasks = []

    async def receive_ws_message_from_js(
        self, instance_id: str, kernel_client_id: str, ws_url: str, payload_message: str
    ):
        envelope: List[str] = json.loads(decode_broadcast_message(payload_message))
        assert isinstance(envelope, list)
        type_ = envelope[0]
        if type_ == "stdin":
            data = envelope[1]
            await self._send_bytes_to_textual_app(data.encode("utf-8"))
        elif type_ == "resize":
            data = envelope[1]
            await self._send_meta_to_textual_app(
                {
                    "type": "resize",
                    "width": data["width"],
                    "height": data["height"],
                }
            )
        elif type_ == "ping":
            data = envelope[1]
            broadcast_channel_suffix = self._broastcast_channel_keymap.get(
                f"{instance_id}@{kernel_client_id}@{ws_url}", ""
            )
            self.send_ws_message_to_js(
                instance_id,
                kernel_client_id,
                ws_url,
                json.dumps(["pong", data]),
                "backend_message",
                broadcast_channel_suffix,
            )
        elif type_ == "blur":
            await self._send_meta_to_textual_app({"type": "blur"})
        elif type_ == "focus":
            await self._send_meta_to_textual_app({"type": "focus"})

    def send_ws_message_to_js(
        self,
        instance_id: str,
        kernel_client_id: str,
        ws_url: str,
        msg: str | bytes,
        action: str = "backend_message",
        broadcast_channel_suffix: Optional[str] = None,
    ):
        broadcast_channel_key = generate_broadcast_channel_name(
            instance_id, kernel_client_id, broadcast_channel_suffix
        )
        broadcast_channel = ALL_BROADCAST_CHANNEL.get(broadcast_channel_key, None)
        if broadcast_channel is not None:
            broadcast_channel.postMessage(
                encode_broadcast_message(kernel_client_id, ws_url, msg, action)
            )

    async def _send_textual_data_to_frontend(
        self,
        instance_id: str,
        kernel_client_id: str,
        ws_url: str,
        broadcast_channel_suffix: Optional[str] = None,
    ):
        await self._ready_event.wait()
        while True:
            msg = await self._driver.stdout_queue.get()
            packet_type, payload = deserialize_packet(msg)
            if packet_type == DATA:
                self.send_ws_message_to_js(
                    instance_id,
                    kernel_client_id,
                    ws_url,
                    payload,
                    "backend_message",
                    broadcast_channel_suffix,
                )

    async def _run(
        self,
        instance_id: str,
        kernel_client_id: str,
        ws_url: str,
        broadcast_channel_suffix: Optional[str] = None,
    ):
        app_task = asyncio.create_task(self._textual_app.run_async())

        self._tasks.append(app_task)
        while True:
            if self._textual_app._driver is not None:
                self._driver = self._textual_app._driver
                if not isinstance(self._driver, JupyterPackDriver):
                    app_task.cancel()
                    raise Exception("Driver is not JupyterPackDriver")
                break
            await asyncio.sleep(0.1)
        ready = False
        # Wait for prelude text
        for _ in range(10):
            line = []
            while True:
                data = await self._driver.stdout_queue.get()
                line.append(data)
                if data[-1] == 10:  # "\n"
                    break
            line = b"".join(line)
            if not line:
                break
            if line == b"__GANGLION__\n":
                ready = True
                break

        if not ready:
            app_task.cancel()
            raise Exception("Textual app did not start correctly")
        else:
            self._ready_event.set()
            self.send_ws_message_to_js(
                instance_id,
                kernel_client_id,
                ws_url,
                "",
                "connected",
                broadcast_channel_suffix,
            )

    async def _send_bytes_to_textual_app(self, data: bytes) -> bool:
        """Send bytes to process.

        Args:
            data: Data to send.

        Returns:
            True if the data was sent, otherwise False.
        """
        await self._ready_event.wait()
        try:
            packet = serialize_packet(DATA, data)
            self._driver.stdin_queue.put_nowait(packet)
        except Exception as e:
            js_log(f"Error sending data to textual app: {e}")
            return False
        return True

    async def _send_meta_to_textual_app(
        self, data: dict[str, str | None | int | bool]
    ) -> bool:
        """Send meta data to process.
        Args:
           data: Data to send.
           Returns:
              True if the data was sent, otherwise False.
        """

        await self._ready_event.wait()
        try:
            data_bytes = json.dumps(data).encode("utf-8")
            packet = serialize_packet(META, data_bytes)
            self._driver.stdin_queue.put_nowait(packet)

        except Exception as e:
            js_log(f"Error sending data to textual app: {e}")
            return False
        return True
