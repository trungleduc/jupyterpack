import json
import datetime
import uuid
import dataclasses
from typing import Any, Callable, Optional, Union


JSONDecodeError = json.JSONDecodeError
JSONEncodeError = TypeError

OPT_APPEND_NEWLINE: int = 1
OPT_INDENT_2: int = 2
OPT_NAIVE_UTC: int = 4
OPT_NON_STR_KEYS: int = 8
OPT_OMIT_MICROSECONDS: int = 16
OPT_PASSTHROUGH_DATACLASS: int = 32
OPT_PASSTHROUGH_DATETIME: int = 64
OPT_PASSTHROUGH_SUBCLASS: int = 128
OPT_SERIALIZE_DATACLASS: int = 256
OPT_SERIALIZE_NUMPY: int = 512
OPT_SERIALIZE_UUID: int = 1024
OPT_SORT_KEYS: int = 2048
OPT_STRICT_INTEGER: int = 4096
OPT_UTC_Z: int = 8192


def _mock_encoder(obj: Any) -> Any:
    if dataclasses.is_dataclass(obj):
        return dataclasses.asdict(obj)

    if isinstance(obj, uuid.UUID):
        return str(obj)

    if hasattr(obj, "tolist") and callable(obj.tolist):
        return obj.tolist()

    if isinstance(obj, (datetime.datetime, datetime.date, datetime.time)):
        return obj.isoformat()

    if isinstance(obj, set):
        return list(obj)

    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


def dumps(
    __obj: Any,
    default: Optional[Callable[[Any], Any]] = None,
    option: Optional[int] = None,
) -> bytes:
    kwargs = {"separators": (",", ":")}

    if default:

        def wrapped_default(o):
            try:
                return default(o)
            except TypeError:
                return _mock_encoder(o)

        kwargs["default"] = wrapped_default
    else:
        kwargs["default"] = _mock_encoder
    return json.dumps(__obj, **kwargs).encode("utf-8")


def loads(
    __obj: Union[bytes, bytearray, memoryview, str],
) -> Any:
    return json.loads(__obj)


class Fragment:
    __slots__ = ("contents",)

    def __init__(self, contents: bytes):
        self.contents = contents
