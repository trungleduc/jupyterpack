import base64
import json
from typing import Dict

from httpx import Client, WSGITransport

from jupyterpack.common import (
    BaseBridge,
)


class WSGIBridge(BaseBridge):
    def __init__(self, wsgi_app, base_url: str):
        self.base_url = base_url
        self.wsgi_app = wsgi_app
        self._wsgi_transport = WSGITransport(app=wsgi_app)

    async def fetch(self, request: Dict):
        """
        request: {body: Optional[bytes], headers: List[Tuple[str, str]], method: str, url: str}
        """
        method = request.get("method", "GET").upper()
        url: str = request.get("url", "/")
        if url.startswith(self.base_url):
            url = url.replace(self.base_url, "")

        headers = dict(request.get("headers", []))
        body = request.get("body", None)
        params = request.get("params", None)

        with Client(
            transport=self._wsgi_transport, base_url="http://testserver"
        ) as client:
            try:
                r = client.request(
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

    async def open_ws(self, *args, **kwargs):
        raise NotImplementedError("WSGI bridge does not support WebSocket")

    async def close_ws(self, *args, **kwargs):
        raise NotImplementedError("WSGI bridge does not support WebSocket")

    async def receive_ws_message_from_js(self, *args, **kwargs):
        raise NotImplementedError("WSGI bridge does not support WebSocket")

    def send_ws_message_to_js(self, *args, **kwargs):
        raise NotImplementedError("WSGI bridge does not support WebSocket")
