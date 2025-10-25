import os
import tempfile
import collections
import threading
if not hasattr(collections, "MutableSet"):
    import collections.abc

    collections.MutableSet = collections.abc.MutableSet

os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"


class WatcherMock:
    def __init__(
        self,
        path,
        callback,
        glob_pattern: str | None = None,
        allow_nonexistent: bool = False,
    ) -> None:
        pass

def __jupyterpack_create_streamlit_app(base_url, script_content):
    from streamlit import config
    import streamlit.web.server.server as st_server
    from streamlit.runtime.runtime import Runtime
    import streamlit.watcher.path_watcher

    streamlit.watcher.path_watcher.watchdog_available = False
    streamlit.watcher.path_watcher.EventBasedPathWatcher = WatcherMock
    streamlit.watcher.path_watcher._is_watchdog_available = lambda: False
    streamlit.watcher.path_watcher.get_path_watcher_class = lambda x: WatcherMock


    if Runtime._instance is not None:
        Runtime._instance.stop()
        Runtime._instance = None
    config.set_option("server.baseUrlPath", base_url)

    config.set_option("server.port", 3001)
    config.set_option("server.enableCORS", False)
    config.set_option("server.enableXsrfProtection", False)

    st_script = script_content

    with tempfile.NamedTemporaryFile(delete=False, mode="w", suffix=".py") as tmp:
        tmp.write(st_script)
        script_path = tmp.name

    streamlit_server = st_server.Server(script_path, True)
    return streamlit_server


class MockedThread(threading.Thread):
    def start(self):
        threading.current_thread = lambda: self
        try:
            self.run()
        except Exception as e:
            raise e

threading.Thread = MockedThread