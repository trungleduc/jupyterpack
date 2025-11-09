import json
from typing import Dict
from .tornadoBridge import TornadoBridge


class TornadoServer:
    def __init__(self, tornado_app, base_url: str):
        self._tornado_server = tornado_app
        self._tornado_bridge = TornadoBridge(tornado_app, base_url)
        self._base_url = base_url

    def dispose(self):
        self._tornado_server = None
        self._tornado_bridge = None

    def reload(self, app):
        self._tornado_server = app
        self._tornado_bridge = TornadoBridge(app, self._base_url)

        return True

    async def open_ws(
        self,
        instance_id: str,
        kernel_client_id: str,
        ws_url: str,
        protocols_str: str | None,
    ):
        if self._tornado_bridge is None:
            raise Exception("Missing tornado instance")
        await self._tornado_bridge.open_ws(
            instance_id, kernel_client_id, ws_url, protocols_str
        )

    async def receive_ws_message(
        self, instance_id: str, kernel_client_id: str, ws_url: str, payload_message: str
    ):
        if self._tornado_bridge is None:
            raise Exception("Missing tornado instance")
        await self._tornado_bridge.receive_ws_message_from_js(
            instance_id, kernel_client_id, ws_url, payload_message
        )

    async def get_response(
        self, method: str, url: str, headers: Dict, content=None, params=None
    ):
        tornado_bridge = self._tornado_bridge
        if tornado_bridge is None:
            raise Exception("Missing tornado instance")
        req_dict = {
            "method": method,
            "url": url,
            "headers": list(headers.items()),
            "body": content,
        }

        response = await tornado_bridge.fetch(req_dict)
        json_str = json.dumps(response)
        return json_str
