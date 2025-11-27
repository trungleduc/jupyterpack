import json
import pathlib
import sys


def patch_shiny():
    sys.modules["orjson"] = json


def get_shiny_app(script_path: str):
    from shiny.express import is_express_app

    if is_express_app(script_path, None):
        import shiny.express._run

        path = pathlib.Path(script_path)
        shiny_app = shiny.express._run.wrap_express_app(path)
        return shiny_app
    else:
        namespace = globals()
        with open(script_path, "r") as f:
            exec(f.read(), namespace)
        return namespace["app"]
