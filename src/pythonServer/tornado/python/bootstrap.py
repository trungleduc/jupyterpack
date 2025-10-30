import sys

if "tornado.gen" in sys.modules:
    del sys.modules["tornado.gen"]

tornado = __jupyterpack_import_from_path(
    "tornado", "/lib/python3.13/site-packages/tornado/__init__.py"
)
