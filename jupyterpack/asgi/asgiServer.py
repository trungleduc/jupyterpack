from typing import Dict, Optional
import httpx
import json
import base64

from ..common import BaseServer


class AsgiServer(BaseServer):
    def __init__(self, app, base_url: str):
        """
        Args:
            app : ASGI application instance
            base_url : base url for the application
        """
        super().__init__(base_url)
        self._app = app
        self._asgi_transport = httpx.ASGITransport(app=app)

    async def get_response(
        self,
        method: str,
        url: str,
        headers: Dict,
        content: Optional[str] = None,
        params: Optional[str] = None,
    ) -> str:
        decoded_content = None
        if content is not None:
            decoded_content = base64.b64decode(content)

        async with httpx.AsyncClient(
            transport=self._asgi_transport, base_url="http://testserver"
        ) as client:
            r = await client.request(
                method, url, headers=headers, content=decoded_content, params=params
            )
            reply_headers = json.dumps(dict(r.headers)).encode("utf-8")
            response = {
                "headers": base64.b64encode(reply_headers).decode("ascii"),
                "content": base64.b64encode(r.content).decode("ascii"),
                "status_code": r.status_code,
            }
            json_str = json.dumps(response)
            return json_str

    async def dispose(self):
        await self._asgi_transport.aclose()
        self._asgi_transport = None

    async def reload(self, app):
        """
        Args:
            app : WSGIApplication instance
        """
        await self.dispose()
        self._app = app
        self._asgi_transport = httpx.ASGITransport(app=app)
        return True
