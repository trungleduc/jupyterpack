from ..common import BaseServer
from .tornadoBridge import TornadoBridge


class TornadoServer(BaseServer):
    def __init__(self, tornado_app, base_url: str):
        super().__init__(base_url)
        self._tornado_server = tornado_app
        self._bridge = TornadoBridge(tornado_app, base_url)

    @property
    def bridge(self):
        return self._bridge

    def dispose(self):
        self._tornado_server = None
        self._bridge = None

    def reload(self, app):
        self._tornado_server = app
        self._bridge = TornadoBridge(app, self.base_url)

        return True
