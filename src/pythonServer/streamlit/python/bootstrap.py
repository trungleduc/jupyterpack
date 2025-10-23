import importlib.util
import sys
from types import ModuleType
import os
import tempfile
import collections
import threading
if not hasattr(collections, "MutableSet"):
    import collections.abc

    collections.MutableSet = collections.abc.MutableSet

os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"


def __jupyterpack_import_from_path(module_name: str, path: str) -> ModuleType:
    """
    Import a Python module from a given file path.
    Always reloads (does not use sys.modules cache).
    """
    # Remove from sys.modules if already loaded
    if module_name in sys.modules:
        del sys.modules[module_name]

    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot import module {module_name} from {path}")

    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


if "tornado.gen" in sys.modules:
    del sys.modules["tornado.gen"]

tornado = __jupyterpack_import_from_path(
    "tornado", "/lib/python3.13/site-packages/tornado/__init__.py"
)


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
            print("EXCEPTION", e)
            raise e

threading.Thread = MockedThread