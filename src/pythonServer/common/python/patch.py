import pyodide_http
import collections

if not hasattr(collections, "MutableSet"):
    import collections.abc

    collections.MutableSet = collections.abc.MutableSet

pyodide_http.patch_all()