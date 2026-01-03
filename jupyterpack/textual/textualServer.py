from .textualBridge import TextualBridge
from ..common import BaseServer


class TextualServer(BaseServer):
    def __init__(self, textual_app, base_url):
        super().__init__(base_url)
        self._app = textual_app
        self._bridge = TextualBridge(textual_app, base_url)

    @property
    def bridge(self):
        if self._bridge is None:
            raise Exception("Missing ASGI bridge instance")
        return self._bridge

    def reload(self, textual_app):
        pass

    def dispose(self):
        self._app = None
        self._bridge = None
