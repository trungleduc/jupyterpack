import asyncio
import tornado.escape
from typing import Any, List

from jupyterpack.common.tools import encode_broadcast_message


class WSConnection:
    def __init__(
        self,
        instance_id: str,
        kernel_client_id: str,
        ws_url: str,
        broadcast_channel: Any,
        protocols: List[str],
    ):
        self.instance_id = instance_id
        self.kernel_client_id = kernel_client_id
        self.ws_url = ws_url
        self.broadcast_channel = broadcast_channel
        self.protocols = protocols

    client_terminated = False

    @property
    def selected_subprotocol(self):
        protocol = self.protocols[0] if len(self.protocols) else None
        return protocol

    def is_closing(self):
        return False

    def write_message(self, msg, binary=False):
        if isinstance(msg, dict):
            msg = tornado.escape.json_encode(msg)
        self.broadcast_channel.postMessage(
            encode_broadcast_message(self.kernel_client_id, self.ws_url, msg)
        )
        f = asyncio.Future()
        f.set_result(None)
        return f

    def write_ping(self, data):
        pass

    def close(self, code, reason=None):
        pass

    async def accept_connection(self, *args, **kwargs):
        pass
