import base64
import json
import traceback
from typing import Dict

from httpx import Client, WSGITransport

from jupyterpack.common import BaseBridge


class WSGIBridge(BaseBridge):
    def __init__(self, wsgi_app, base_url: str, origin: str):
        self.base_url = base_url
        self.wsgi_app = wsgi_app
        self._origin = origin if origin is not None else "http://testserver"
        self._wsgi_transport = WSGITransport(app=wsgi_app)

    async def fetch(self, request: Dict):
        """
        request: {body: Optional[bytes], headers: List[Tuple[str, str]], method: str, url: str}
        """
        method = request.get("method", "GET").upper()
        url = request.get("url", "/")
        headers = dict(request.get("headers", []))
        body = request.get("body", None)
        params = request.get("params", None)
        origin: str = headers.get("origin", self._origin)
        if origin.endswith("/"):
            origin = origin[:-1]
        headers["origin"] = origin

        with Client(transport=self._wsgi_transport, base_url=origin) as client:
            try:
                r = client.request(
                    method, url, headers=headers, content=body, params=params
                )
                content_b64 = base64.b64encode(r.content).decode("ascii")

                # encode headers like ConnectionState
                headers_dict = dict(r.headers)
                headers_dict.pop("content-security-policy", None)
                headers_json = json.dumps(headers_dict).encode("utf-8")

                headers_b64 = base64.b64encode(headers_json).decode("ascii")
                return {
                    "content": content_b64,
                    "headers": headers_b64,
                    "status_code": r.status_code,
                }
            except Exception:
                stack_str = traceback.format_exc()
                return {
                    "headers": "e30=",  # {}
                    "content": base64.b64encode(str(stack_str).encode()).decode(
                        "ascii"
                    ),
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
