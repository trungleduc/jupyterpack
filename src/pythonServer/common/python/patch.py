import pyodide_http
import pyodide_http._urllib
from pyodide_http._urllib import urlopen as _urlopen_original
from pyodide_http._core import Request
import urllib.request


def patch_urllib_urlopen():
    def patched_urlopen(request: Request | str, data=None, *args, **kwargs):
        if not isinstance(request, urllib.request.Request):
            request = urllib.request.Request(request, data)

        if "content-type" not in request.headers and request.data is not None:
            request.add_header("content-type", "application/x-www-form-urlencoded")
        return _urlopen_original(request, *args, **kwargs)

    pyodide_http._urllib.urlopen = patched_urlopen

patch_urllib_urlopen()
pyodide_http.patch_all()