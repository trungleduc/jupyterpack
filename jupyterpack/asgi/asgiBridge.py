import base64
import json
from typing import Dict, List, Optional, Tuple

from httpx import ASGITransport, AsyncClient

from jupyterpack.common import (
    BaseBridge,
    decode_broadcast_message,
    encode_broadcast_message,
    generate_broadcast_channel_name,
)

from jupyterpack.js import BroadcastChannel

from .websocketHandler import WebSocketAdapter

ALL_BROADCAST_CHANNEL: Dict[str, BroadcastChannel] = {}


class ASGIBridge(BaseBridge):
    def __init__(self, asgi_app, base_url: str):
        self.base_url = base_url
        self.asgi_app = asgi_app
        self._http_transport = ASGITransport(app=asgi_app)

        self._ws_adapters: Dict[str, WebSocketAdapter] = {}
        self._tasks = []

    # ---------------------------
    # HTTP
    # ---------------------------
    async def fetch(self, request: Dict):
        """
        request: {body: Optional[bytes], headers: List[Tuple[str, str]], method: str, url: str}
        """
        method = request.get("method", "GET").upper()
        url = request.get("url", "/")
        headers = dict(request.get("headers", []))
        body = request.get("body", None)
        params = request.get("params", None)

        async with AsyncClient(
            transport=self._http_transport, base_url="http://testserver"
        ) as client:
            try:
                r = await client.request(
                    method, url, headers=headers, content=body, params=params
                )
                content_b64 = base64.b64encode(r.content).decode("ascii")

                # encode headers like ConnectionState
                headers_json = json.dumps(dict(r.headers)).encode("utf-8")
                headers_b64 = base64.b64encode(headers_json).decode("ascii")
                return {
                    "content": content_b64,
                    "headers": headers_b64,
                    "status_code": r.status_code,
                }
            except Exception as e:
                return {
                    "headers": "e30=",  # {}
                    "content": base64.b64encode(str(e).encode()).decode("ascii"),
                    "status_code": 500,
                }

    async def open_ws(
        self,
        instance_id: str,
        kernel_client_id: str,
        ws_url: str,
        protocols_str: Optional[str] = None,
    ):
        handler_key = f"{instance_id}@{kernel_client_id}@{ws_url}"
        broadcast_channel_key = generate_broadcast_channel_name(
            instance_id, kernel_client_id
        )
        broadcast_channel = ALL_BROADCAST_CHANNEL.get(broadcast_channel_key)
        if broadcast_channel is None:
            broadcast_channel = BroadcastChannel(broadcast_channel_key)
            ALL_BROADCAST_CHANNEL[broadcast_channel_key] = broadcast_channel

        ws_adapter = WebSocketAdapter(kernel_client_id, ws_url, broadcast_channel)

        self._ws_adapters[handler_key] = ws_adapter

        raw_headers: List[Tuple[str, str]] = [
            ("Upgrade", "websocket"),
            ("Connection", "Upgrade"),
            ("Sec-WebSocket-Key", ""),
            ("Sec-WebSocket-Version", "13"),
        ]
        if protocols_str:
            raw_headers.append(("Sec-WebSocket-Protocol", protocols_str))
        headers = [(k.encode("utf-8"), v.encode("utf-8")) for (k, v) in raw_headers]
        scope = {
            "type": "websocket",
            "asgi": {"version": "3.0", "spec_version": "2.3"},
            "http_version": "1.1",
            "server": ("127.0.0.1", 8081),
            "client": ("127.0.0.1", 56789),
            "scheme": "ws",
            "root_path": "",
            "headers": headers,
            "method": "GET",
            "path": ws_url,
            "raw_path": ws_url.encode("utf8"),
            "query_string": "".encode("utf8"),
        }

        ws_adapter.start(self.asgi_app, scope)

    async def close_ws(self, instance_id: str, kernel_client_id: str, ws_url: str):
        handler_key = f"{instance_id}@{kernel_client_id}@{ws_url}"
        adapter = self._ws_adapters.pop(handler_key, None)
        if adapter is not None:
            adapter.stop()

    async def receive_ws_message_from_js(
        self, instance_id: str, kernel_client_id: str, ws_url: str, payload_message: str
    ):
        handler_key = f"{instance_id}@{kernel_client_id}@{ws_url}"
        adapter = self._ws_adapters.get(handler_key, None)
        if adapter is not None:
            data = decode_broadcast_message(payload_message)
            adapter.queue_message(data)

    def send_ws_message_to_js(
        self,
        instance_id: str,
        kernel_client_id: str,
        ws_url: str,
        msg: str | bytes,
        action: str = "backend_message",
    ):
        broadcast_channel_key = f"{instance_id}@{kernel_client_id}@{ws_url}"
        broadcast_channel = ALL_BROADCAST_CHANNEL.get(broadcast_channel_key)
        if broadcast_channel is not None:
            broadcast_channel.postMessage(
                encode_broadcast_message(kernel_client_id, ws_url, msg, action)
            )
