from platform import platform


if "wasm" in platform():
    IS_WASM = True
else:
    IS_WASM = False

if IS_WASM:
    try:
        from pyjs import js
    except ImportError:
        try:
            import js
        except ImportError:
            js = None

    if js is None:
        js_log = print
    else:
        js_log = js.console.log
else:
    js_log = print
