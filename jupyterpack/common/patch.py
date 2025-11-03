from .tools import import_from_path
import sys


def patch_all():
    import collections

    if not hasattr(collections, "MutableSet"):
        import collections.abc

        collections.MutableSet = collections.abc.MutableSet
    try:
        import pyodide_http

        pyodide_http.patch_all()
    except ImportError:
        pass


def patch_tornado():
    """Patch tornado here to avoid import issue in jupyterpack.tornado"""

    if "tornado.gen" in sys.modules:
        del sys.modules["tornado.gen"]

    import_from_path("tornado", "/lib/python3.13/site-packages/tornado/__init__.py")
