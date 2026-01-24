import contextlib
import multiprocessing
from pathlib import Path
import sys
from platform import platform

from ..js import register_comm_target
from .tools import create_mock_module, import_from_path

if "wasm" in platform():
    IS_WASM = True
else:
    IS_WASM = False


def patch_multiprocessing():
    if IS_WASM:
        multiprocessing.Lock = contextlib.nullcontext


def patch_anyio():
    if not IS_WASM:
        return

    async def _run_sync_in_worker_thread(
        func, args, abandon_on_cancel=False, limiter=None, **kwargs
    ):
        return func(*args)

    try:
        import anyio

        _get_async_backend = anyio._core._eventloop.get_async_backend

        def get_async_backend(*args, **kwargs):
            Cls = _get_async_backend(*args, **kwargs)
            Cls.run_sync_in_worker_thread = _run_sync_in_worker_thread
            return Cls

        anyio._core._eventloop.get_async_backend = get_async_backend
        anyio.to_thread.get_async_backend = get_async_backend
    except Exception:
        pass


def patch_startlette():
    if not IS_WASM:
        return
    import starlette.concurrency

    async def _run_in_threadpool(func, *args, **kwargs):
        return func(*args, **kwargs)

    starlette.concurrency.run_in_threadpool = _run_in_threadpool


def patch_tornado():
    if IS_WASM:
        """Patch tornado here to avoid import issue in jupyterpack.tornado"""

        if "tornado.gen" in sys.modules:
            del sys.modules["tornado.gen"]
        try:
            import_from_path(
                "tornado", "/lib/python3.13/site-packages/tornado/__init__.py"
            )

            from tornado.httpserver import HTTPServer

            def add_sockets(*ignore):
                pass

            HTTPServer.add_sockets = add_sockets
        except (FileNotFoundError, ImportError):
            pass


def patch_watchdog():
    if IS_WASM:
        content = """
class FileSystemEventHandler:
    def __init__(self, *args, **kwargs):
       pass
"""
        create_mock_module("watchdog.events", content)


def patch_orjson():
    if not IS_WASM:
        return
    cwd = Path(__file__).parent
    orjson_path = cwd / "orjson.py"
    import_from_path("orjson", orjson_path)


def patch_all():
    if IS_WASM:
        import collections

        if not hasattr(collections, "MutableSet"):
            import collections.abc

            collections.MutableSet = collections.abc.MutableSet
        try:
            import pyodide_http

            pyodide_http.patch_all()
        except ImportError:
            pass

        import resource

        resource.getrusage = lambda *args, **kwargs: None
        resource.RUSAGE_THREAD = 0
        resource.RUSAGE_SELF = 0

        patch_orjson()
        create_mock_module("black")

        patch_anyio()
        patch_startlette()
        patch_multiprocessing()
        patch_tornado()
        patch_watchdog()
    else:
        register_comm_target()
