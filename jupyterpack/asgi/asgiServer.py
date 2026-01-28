from jupyterpack.asgi.asgiBridge import ASGIBridge

from ..common import BaseServer


class AsgiServer(BaseServer):
    def __init__(self, asgi_app, base_url: str, origin: str):
        """
        Args:
            app : ASGI application instance
            base_url : base url for the application
        """
        super().__init__(base_url)
        self._app = asgi_app
        self._origin = origin
        self._bridge = ASGIBridge(asgi_app, base_url, origin)

    @property
    def bridge(self):
        if self._bridge is None:
            raise Exception("Missing ASGI bridge instance")
        return self._bridge

    async def dispose(self):
        self._app = None
        self._bridge = None

    def reload(self, app):
        """
        Args:
            app : ASGIApplication instance
        """
        self._app = app
        self._bridge = ASGIBridge(app, self.base_url, self._origin)
        return True
