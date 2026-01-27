import os
import sys
from jupyterpack.wsgi import WsgiServer

app_modules: set[str] = set()


def make_path_absolute(file_path: str):
    if os.path.isabs(file_path):
        return file_path
    absolute_path = os.path.join(os.getcwd(), file_path)
    return absolute_path


def clear_app_modules() -> None:
    labs_modules: set[str] = set()
    for module in sys.modules:
        if module.startswith("mesop.labs"):
            labs_modules.add(module)
    for module in labs_modules:
        del sys.modules[module]

    for module in app_modules:
        # Not every module has been loaded into sys.modules (e.g. the main module)
        if module in sys.modules:
            del sys.modules[module]


def get_module_name_from_path(path: str) -> str:
    segments = path.split(os.path.sep)

    # Trim the filename extension (".py") from the last path segment.
    segments[len(segments) - 1] = segments[len(segments) - 1].split(".")[0]
    return ".".join(segments)


def create_mesop_flask_app(script_path: str, base_url: str):
    os.environ["MESOP_BASE_URL_PATH"] = base_url

    from mesop.cli.execute_module import execute_module
    from mesop.server.wsgi_app import create_app
    from mesop.runtime import reset_runtime
    reset_runtime(without_hot_reload=True)
    def execute_main_module(absolute_path: str):
        try:
            # Clear app modules
            clear_app_modules()
            execute_module(
                module_path=absolute_path,
                module_name=get_module_name_from_path(absolute_path),
            )
        except Exception as e:
            raise e

    absolute_path = make_path_absolute(script_path)
    sys.path = [os.path.dirname(absolute_path), *sys.path]
    app = create_app(
        prod_mode=True,
        run_block=lambda: execute_main_module(absolute_path=absolute_path),
    )
    return app._flask_app


class MesopServer(WsgiServer):
    def __init__(self, script_path: str, base_url: str):
        mesop_flask_app = create_mesop_flask_app(script_path, base_url)
        super().__init__(mesop_flask_app, base_url)

    def reload(self, script_path):
        mesop_flask_app = create_mesop_flask_app(script_path, self.base_url)
        return super().reload(mesop_flask_app)