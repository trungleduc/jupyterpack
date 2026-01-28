from ..common import BaseServer
from .wsgiBridge import WSGIBridge


class WsgiServer(BaseServer):
    def __init__(self, wsgi_app, base_url: str, origin: str):
        """
        Args:
            app : WSGIApplication instance
            base_url : base url for the applicatio
        """
        super().__init__(base_url)
        self._app = wsgi_app
        self._origin = origin
        self._bridge = WSGIBridge(wsgi_app, base_url, origin)

    @property
    def bridge(self):
        if self._bridge is None:
            raise Exception("Missing ASGI bridge instance")
        return self._bridge

    def dispose(self):
        self._app = None
        self._bridge = None

    def reload(self, app):
        """
        Args:
            app : WSGIApplication instance
        """
        self._app = app
        self._bridge = WSGIBridge(app, self.base_url, self._origin)
        return True
