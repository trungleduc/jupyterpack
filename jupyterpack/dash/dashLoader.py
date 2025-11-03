import httpx
import json
import base64
from ..common.tools import set_base_url_env


class DashServer:
    def __init__(self, app, base_url):
        self._app = app
        self._base_url = base_url
        set_base_url_env(base_url)
        self._dash_transport = httpx.WSGITransport(app=app.server)

    def get_response(self, method, url, headers, content=None, params=None) -> str:
        decoded_content = None
        if content is not None:
            decoded_content = base64.b64decode(content)

        with httpx.Client(
            transport=self._dash_transport, base_url="http://testserver"
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
        self._dash_transport = None

    def reload(self, app):
        self.dispose()
        self._app = app
        self._dash_transport = httpx.WSGITransport(app=app.server)
        return True
