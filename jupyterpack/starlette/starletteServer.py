from jupyterpack.asgi.asgiBridge import ASGIBridge
from ..asgi.asgiServer import AsgiServer
from starlette.applications import Starlette
from starlette.routing import Mount


class StarletteServer(AsgiServer):
    def __init__(self, starlette_app, base_url: str, origin: str):
        """
        Args:
            app : ASGI application instance
            base_url : base url for the application
        """

        main_app = Starlette(
            routes=[
                Mount(base_url, app=starlette_app),
            ]
        )
        super().__init__(main_app, base_url, origin)

    def reload(self, starlette_app):
        """
        Args:
            app : ASGIApplication instance
        """
        self._app = Starlette(
            routes=[
                Mount(self.base_url, app=starlette_app),
            ]
        )
        self._bridge = ASGIBridge(self._app, self.base_url, self._origin)
        return True
