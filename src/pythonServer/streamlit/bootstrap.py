import base64
import importlib.util
import json
import sys
from types import ModuleType


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


tornado = __jupyterpack_import_from_path(
    "tornado", "/lib/python3.13/site-packages/tornado/__init__.py"
)


def __jupyterpack_streamlit_get_response(
    method, url, headers, content=None, params=None
):
    response = {
        "headers": dict(headers),
        "content": "hello streamlit",
        "status_code": 200,
        "original_request": {
            "method": method,
            "url": url,
            "params": params,
            "headers": headers,
        },
    }
    json_str = json.dumps(response)
    b64_str = base64.b64encode(json_str.encode("utf-8")).decode("utf-8")
    return b64_str
