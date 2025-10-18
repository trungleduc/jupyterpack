import importlib.util
import sys
from types import ModuleType
import os


import collections
if not hasattr(collections, 'MutableSet'):
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

if 'tornado.gen' in sys.modules:
    del sys.modules['tornado.gen']

tornado = __jupyterpack_import_from_path(
    "tornado", "/lib/python3.13/site-packages/tornado/__init__.py"
)

