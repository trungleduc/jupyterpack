import base64
import json
from textual_serve.server import Server
from typing import Dict
from aiohttp.test_utils import make_mocked_request
from jupyterpack.common import BaseBridge
from .tools import MemoryWriter


class TextualBridge(BaseBridge):
    def __init__(self, textual_app, base_url: str):
        self.base_url = base_url
        self.wsgi_app = textual_app
        self._public_url = "http://" + f"127.0.0.1:8448/{base_url}".replace(
            "//", "/"
        ).removesuffix("/")

        self._textual_server = Server("", public_url=self._public_url)
        self._temp_app = None

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

    async def open_ws(self, *args, **kwargs):
        raise NotImplementedError("WSGI bridge does not support WebSocket")

    async def close_ws(self, *args, **kwargs):
        raise NotImplementedError("WSGI bridge does not support WebSocket")

    async def receive_ws_message_from_js(self, *args, **kwargs):
        raise NotImplementedError("WSGI bridge does not support WebSocket")

    def send_ws_message_to_js(self, *args, **kwargs):
        raise NotImplementedError("WSGI bridge does not support WebSocket")
