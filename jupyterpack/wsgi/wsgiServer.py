from typing import Dict, Optional
import httpx
import json
import base64

from ..common import BaseServer


class WsgiServer(BaseServer):
    def __init__(self, app, base_url: str):
        """
        Args:
            app : WSGIApplication instance
            base_url : base url for the applicatio
        """
        super().__init__(base_url)
        self._app = app
        self._wsgi_transport = httpx.WSGITransport(app=app)

    def get_response(
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

        with httpx.Client(
            transport=self._wsgi_transport, base_url="http://testserver"
        ) as client:
            r = client.request(
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

    def dispose(self):
        self._wsgi_transport = None

    def reload(self, app):
        """
        Args:
            app : WSGIApplication instance
        """
        self.dispose()
        self._app = app
        self._wsgi_transport = httpx.WSGITransport(app=app)
        return True
