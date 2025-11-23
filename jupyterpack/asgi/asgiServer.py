import json
from typing import Dict, Optional


from jupyterpack.asgi.asgiBridge import ASGIBridge

from ..common import BaseServer


class AsgiServer(BaseServer):
    def __init__(self, asgi_app, base_url: str):
        """
        Args:
            app : ASGI application instance
            base_url : base url for the application
        """
        super().__init__(base_url)
        self._app = asgi_app
        self._asgi_bridge = ASGIBridge(asgi_app, base_url)

    async def get_response(
        self,
        method: str,
        url: str,
        headers: Dict,
        content: Optional[str] = None,
        params: Optional[str] = None,
    ) -> str:
        asgi_bridge = self._asgi_bridge
        if asgi_bridge is None:
            raise Exception("Missing tornado instance")
        req_dict = {
            "method": method,
            "url": url,
            "headers": list(headers.items()),
            "body": content,
        }

        response = await asgi_bridge.fetch(req_dict)
        json_str = json.dumps(response)
        return json_str

    @property
    def asgi_bridge(self):
        if self._asgi_bridge is None:
            raise Exception("Missing ASGI instance")
        return self._asgi_bridge

    async def dispose(self):
        self._app = None
        self._asgi_bridge = None

    def reload(self, app):
        """
        Args:
            app : WSGIApplication instance
        """
        self._app = app
        self._asgi_bridge = ASGIBridge(app, self.base_url)
        return True

    async def open_ws(
        self,
        instance_id: str,
        kernel_client_id: str,
        ws_url: str,
        protocols_str: str | None,
    ):
        """ """
        try:
            await self.asgi_bridge.open_ws(
                instance_id, kernel_client_id, ws_url, protocols_str
            )
        except Exception:
            raise

    async def close_ws(self, instance_id: str, kernel_client_id: str, ws_url: str):
        await self.asgi_bridge.close_ws(instance_id, kernel_client_id, ws_url)

    async def receive_ws_message(
        self, instance_id: str, kernel_client_id: str, ws_url: str, payload_message: str
    ):
        await self.asgi_bridge.receive_ws_message_from_js(
            instance_id, kernel_client_id, ws_url, payload_message
        )
