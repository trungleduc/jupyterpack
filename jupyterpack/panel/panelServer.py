from .tools import create_panel_app
from ..tornado.tornadoServer import TornadoServer


class PanelServer(TornadoServer):
    def __init__(self, script_path: str, base_url: str):
        tornado_app = create_panel_app(script_path, base_url)
        super().__init__(tornado_app, base_url)

    def dispose(self):
        super().dispose()

    def reload(self, script_path: str):
        tornado_app = create_panel_app(script_path, self.base_url)
        return super().reload(tornado_app)
