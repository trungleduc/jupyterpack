from tornado.iostream import BaseIOStream
from tornado.httputil import HTTPHeaders

from typing import List, Tuple


class DumpStream(BaseIOStream):
    max_buffer_size = 1048576000

    def close_fd(*args, **kwargs):
        pass

    def write_to_fd(self, buf):
        raise NotImplementedError("Not supported!")


def convert_headers(
    headers: List[Tuple[str, str]],
) -> HTTPHeaders:
    tornado_headers = HTTPHeaders()
    for k, v in headers:
        tornado_headers.add(k, v)
    return tornado_headers
