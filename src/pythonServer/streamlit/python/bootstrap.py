import os

import threading
import streamlit.watcher.path_watcher
import contextlib
import streamlit.elements.spinner

os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"


class MockedThread(threading.Thread):
    def start(self):
        threading.current_thread = lambda: self
        try:
            self.run()
        except Exception as e:
            raise e


threading.Thread = MockedThread


class WatcherMock:
    def __init__(
        self,
        path,
        callback,
        glob_pattern: str | None = None,
        allow_nonexistent: bool = False,
    ) -> None:
        pass

    def close(self) -> None:
        pass


streamlit.watcher.path_watcher.watchdog_available = False
streamlit.watcher.path_watcher.EventBasedPathWatcher = WatcherMock
streamlit.watcher.path_watcher._is_watchdog_available = lambda: False
streamlit.watcher.path_watcher.get_path_watcher_class = lambda x: WatcherMock


class MockThreading:
    class Timer:
        def __init__(self, delay, cb):
            cb()

        def start(self):
            pass

    Lock = contextlib.nullcontext


streamlit.elements.spinner.threading = MockThreading
