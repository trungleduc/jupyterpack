from streamlit import config
import streamlit.web.server.server as st_server
from streamlit.runtime.runtime import Runtime
import tornado

from ..tornado.tornadoServer import TornadoServer


async def create_streamlit_app(script_path: str, base_url: str):
    if Runtime._instance is not None:
        Runtime._instance.stop()
        Runtime._instance = None
    config.set_option("server.baseUrlPath", base_url)

    config.set_option("server.port", 6789)
    config.set_option("server.enableCORS", False)
    config.set_option("server.enableXsrfProtection", False)
    streamlit_server = st_server.Server(script_path, True)

    tornado_app = streamlit_server._create_app()
    await streamlit_server._runtime.start()

    return streamlit_server, tornado_app


class StreamlitServer(TornadoServer):
    def __init__(
        self,
        tornado_app: tornado.web.Application,
        base_url: str,
        streamlit_server: st_server.Server,
    ):
        super().__init__(tornado_app, base_url)
        self._streamlit_server = streamlit_server

    def dispose(self):
        if self._streamlit_server is not None:
            self._streamlit_server._runtime.stop()
            self._streamlit_server = None
        super().dispose()

    def reload(
        self, tornado_app: tornado.web.Application, streamlit_server: st_server.Server
    ):
        self._streamlit_server = streamlit_server
        return super().reload(tornado_app)
