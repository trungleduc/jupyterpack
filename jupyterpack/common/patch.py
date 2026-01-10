import contextlib
import multiprocessing
import sys
from platform import platform

from ..js import register_comm_target
from .tools import create_mock_module, import_from_path

if "wasm" in platform():
    IS_WASM = True
else:
    IS_WASM = False


def run_sync_in_worker_thread(
    func, *args, abandon_on_cancel=False, limiter=None, **kwargs
):
    import asyncio

    future = asyncio.get_running_loop().create_future()
    error = None
    try:
        val = func(*args)
    except Exception as exc:
        error = exc

    if error is not None:
        future.set_exception(error)
    else:
        future.set_result(val)

    return future


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

        try:
            import anyio

            _get_async_backend = anyio._core._eventloop.get_async_backend

            def get_async_backend(*args, **kwargs):
                Cls = _get_async_backend(*args, **kwargs)
                Cls.run_sync_in_worker_thread = run_sync_in_worker_thread
                return Cls

            anyio._core._eventloop.get_async_backend = get_async_backend
            anyio.to_thread.get_async_backend = get_async_backend
        except Exception:
            pass

    else:
        register_comm_target()


def patch_tornado():
    if IS_WASM:
        """Patch tornado here to avoid import issue in jupyterpack.tornado"""

        if "tornado.gen" in sys.modules:
            del sys.modules["tornado.gen"]

        import_from_path("tornado", "/lib/python3.13/site-packages/tornado/__init__.py")

        from tornado.httpserver import HTTPServer

        def add_sockets(*ignore):
            pass

        HTTPServer.add_sockets = add_sockets


def patch_watchdog():
    if IS_WASM:
        content = """
class FileSystemEventHandler:
    def __init__(self, *args, **kwargs):
       pass
"""
        create_mock_module(["watchdog.events"], content)


def patch_multiprocessing():
    if IS_WASM:
        multiprocessing.Lock = contextlib.nullcontext
