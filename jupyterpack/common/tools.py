import base64
import importlib.util
import json
import os
import sys
import tempfile
from pathlib import Path
from types import ModuleType
from typing import List, Union


def set_base_url_env(base_url: str):
    os.environ["JUPYTERPACK_BASE_URL"] = base_url


def import_from_path(module_name: str, path: str) -> ModuleType:
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


def create_mock_module(module_names: List[str], mock_content: str, patch_parent=True):
    tmpdir = tempfile.TemporaryDirectory()
    package_dir = Path(tmpdir.name) / "__jupyterpack_mock_module"
    package_dir.mkdir()
    (package_dir / "__init__.py").write_text(mock_content)

    sys.path.insert(0, tmpdir.name)
    mock_module = importlib.import_module("__jupyterpack_mock_module")
    sys.path.pop(0)
    for module_name in module_names:
        if patch_parent:
            parts = module_name.split(".")
            for i in range(1, len(parts) + 1):
                subpath = ".".join(parts[:i])
                sys.modules[subpath] = mock_module

            for i in range(1, len(parts)):
                parent_name = ".".join(parts[:i])
                child_name = ".".join(parts[: i + 1])
                parent_mod = sys.modules[parent_name]
                child_mod = sys.modules[child_name]
                setattr(parent_mod, parts[i], child_mod)
        else:
            sys.modules[module_name] = mock_module

    return tmpdir


def encode_broadcast_message(
    kernel_client_id: str,
    ws_url: str,
    msg: str | bytes,
    action: str = "backend_message",
):
    if isinstance(msg, bytes):
        is_binary = True
        b64_msg = base64.b64encode(msg).decode("ascii")
    elif isinstance(msg, str):
        is_binary = False
        b64_msg = msg

    return json.dumps(
        {
            "action": action,
            "dest": kernel_client_id,
            "wsUrl": ws_url,
            "payload": {"isBinary": is_binary, "data": b64_msg},
        }
    )


def decode_broadcast_message(payload_message: str) -> Union[bytes, str]:
    msg_object = json.loads(payload_message)
    is_binary = msg_object["isBinary"]
    data = msg_object["data"]
    binary_data = base64.b64decode(data)
    if is_binary:
        return binary_data
    else:
        return binary_data.decode("utf-8")


def generate_broadcast_channel_name(instance_id: str, kernel_client_id: str) -> str:
    return f"/jupyterpack/ws/{instance_id}/{kernel_client_id}"
