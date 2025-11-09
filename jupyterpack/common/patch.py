from .tools import import_from_path
import sys
from ..js import register_comm_target
from platform import platform

if "wasm" in platform():
    IS_WASM = True
else:
    IS_WASM = False


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
    else:
        register_comm_target()


def patch_tornado():
    if IS_WASM:
        """Patch tornado here to avoid import issue in jupyterpack.tornado"""

        if "tornado.gen" in sys.modules:
            del sys.modules["tornado.gen"]

        import_from_path("tornado", "/lib/python3.13/site-packages/tornado/__init__.py")
