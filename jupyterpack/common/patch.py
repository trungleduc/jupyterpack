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
