import asyncio
from typing import Optional, Union

from ..common.tools import encode_broadcast_message


class WebSocketAdapter:
    def __init__(self, kernel_client_id, ws_url, broadcast_channel):
        self.kernel_client_id = kernel_client_id
        self.ws_url = ws_url
        self.broadcast_channel = broadcast_channel

        self.queue = asyncio.Queue()
        self._is_open_call = True
        self._task: Optional[asyncio.Task] = None

    async def send(self, msg):
        try:
            if msg["type"] == "websocket.accept":
                self.broadcast_channel.postMessage(
                    encode_broadcast_message(
                        self.kernel_client_id, self.ws_url, "", "connected"
                    )
                )

            elif msg["type"] == "websocket.send":
                payload = msg.get("text") or msg.get("bytes")
                if payload is None:
                    raise ValueError("unknown websocket.send message")
                self.broadcast_channel.postMessage(
                    encode_broadcast_message(
                        self.kernel_client_id, self.ws_url, payload, "backend_message"
                    )
                )
            elif msg["type"] == "websocket.close":
                if self._task and not self._task.done():
                    self._task.cancel()
            else:
                raise ValueError(f"unknown message type {msg['type']}")
        except Exception as e:
            print("Exception in websocket send", e)
            raise

    async def receive(self):
        if self._is_open_call:
            self._is_open_call = False
            return {"type": "websocket.connect"}
        else:
            data = await self.queue.get()
            reply = {"type": "websocket.receive"}
            if isinstance(data, bytes):
                reply["bytes"] = data
            elif isinstance(data, str):
                reply["text"] = data

            return reply

    def start(self, asgi_app, scope):
        if self._task is None:
            self._task = asyncio.create_task(self._run_app(asgi_app, scope))
        return self._task

    def stop(self):
        if self._task and not self._task.done():
            self._task.cancel()

    def queue_message(self, data: Union[bytes, str]):
        self.queue.put_nowait(data)

    async def _run_app(self, asgi_app, scope):
        try:
            await asgi_app(scope, self.receive, self.send)
        except asyncio.CancelledError:
            pass  # Websocket closed
        except Exception as e:
            print("Exception in websocket app", e)
            raise
