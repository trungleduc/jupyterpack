from .textualBridge import TextualBridge
from ..common import BaseServer


class TextualServer(BaseServer):
    def __init__(self, textual_app, base_url):
        super().__init__(base_url)
        self._app = textual_app
        self._bridge = TextualBridge(textual_app, base_url)

    @property
    def bridge(self):
        return self._bridge

    def reload(self, textual_app):
        self._app = textual_app
        self._bridge = TextualBridge(textual_app, self.base_url)

        return True

    def dispose(self):
        if self._bridge is not None:
            self._bridge.dispose()
            self._bridge = None
        self._app = None
