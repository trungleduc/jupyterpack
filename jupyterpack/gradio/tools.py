import asyncio
import os
from pathlib import Path
import sys

from typing import Any, Callable, Literal, Sequence


from ..common.tools import create_mock_module

GRADIO_SERVER = {}


def get_gradio_server(instance_id: str, kernel_client_id: str):
    return GRADIO_SERVER.get(f"{instance_id}@{kernel_client_id}", None)


def patch_gradio(base_url: str, instance_id: str, kernel_client_id: str):
    os.link = lambda src, dst: None
    os.environ["GRADIO_ANALYTICS_ENABLED"] = "false"
    sys.modules["audioop"] = {}

    content = """
def transpile(*args, **kwargs):
    return ''
"""
    create_mock_module("groovy", content)

    ffmpeg = """
class FFmpeg:
    def __init__(self, *args, **kwargs):
        pass
    def run(self, *args, **kwargs):
        pass
"""
    create_mock_module("ffmpy", ffmpeg)

    from gradio import utils, blocks

    from gradio.route_utils import API_PREFIX
    from gradio.utils import (
        TupleNoPrint,
    )

    def launch(
        self,
        max_threads: int = 40,
        show_error: bool = True,
        server_name: str | None = "0.0.0.0",
        server_port: int | None = 8778,
        *,
        height: int = 500,
        width: int | str = "100%",
        favicon_path: str | Path | None = None,
        quiet: bool = False,
        footer_links: list[Literal["api", "gradio", "settings"] | dict[str, str]]
        | None = None,
        allowed_paths: list[str] | None = None,
        blocked_paths: list[str] | None = None,
        app_kwargs: dict[str, Any] | None = None,
        state_session_capacity: int = 10000,
        auth_dependency: Callable[[Any], str | None] | None = None,
        max_file_size: str | int | None = None,
        strict_cors: bool = False,
        pwa: bool | None = None,
        i18n: Any | None = None,
        theme: Any | str | None = None,
        css: str | None = None,
        css_paths: str | Path | Sequence[str | Path] | None = None,
        js: str | Literal[True] | None = None,
        head: str | None = None,
        head_paths: str | Path | Sequence[str | Path] | None = None,
        **kwargs,
    ) -> tuple[Any, str, str]:
        from gradio.routes import App

        theme = theme if theme is not None else self._deprecated_theme
        css = css if css is not None else self._deprecated_css
        css_paths = css_paths if css_paths is not None else self._deprecated_css_paths
        js = js if js is not None else self._deprecated_js
        head = head if head is not None else self._deprecated_head
        head_paths = (
            head_paths if head_paths is not None else self._deprecated_head_paths
        )

        self.theme = utils.get_theme(theme)
        self.css = css
        self.css_paths = css_paths or []
        self.js = js
        self.head = head
        self.head_paths = head_paths
        self._set_html_css_theme_variables()

        if self._is_running_in_reload_thread:
            # We have already launched the demo
            return None, None, None  # type: ignore

        if not self.exited:
            self.__exit__()

        self.show_error = show_error
        self.height = height
        self.width = width
        self.favicon_path = favicon_path
        self.ssl_verify = False

        self.state_session_capacity = state_session_capacity

        self.root_path = base_url.removesuffix("/") if base_url else ""
        self.footer_links = footer_links or ["api", "gradio", "settings"]

        if allowed_paths:
            self.allowed_paths = allowed_paths
        else:
            allowed_paths_env = os.environ.get("GRADIO_ALLOWED_PATHS", "")
            if len(allowed_paths_env) > 0:
                self.allowed_paths = [
                    item.strip() for item in allowed_paths_env.split(",")
                ]
            else:
                self.allowed_paths = []

        if blocked_paths:
            self.blocked_paths = blocked_paths
        else:
            blocked_paths_env = os.environ.get("GRADIO_BLOCKED_PATHS", "")
            if len(blocked_paths_env) > 0:
                self.blocked_paths = [
                    item.strip() for item in blocked_paths_env.split(",")
                ]
            else:
                self.blocked_paths = []

        if not isinstance(self.allowed_paths, list):
            raise ValueError("`allowed_paths` must be a list of directories.")
        if not isinstance(self.blocked_paths, list):
            raise ValueError("`blocked_paths` must be a list of directories.")

        self.validate_queue_settings()
        self.max_file_size = utils._parse_file_size(max_file_size)

        if self.dev_mode:
            for block in self.blocks.values():
                if block.key is None:
                    block.key = f"__{block._id}__"

        self.pwa = utils.get_space() is not None if pwa is None else pwa
        self.max_threads = max_threads
        self._queue.max_thread_count = max_threads
        self.transpile_to_js(quiet=quiet)

        self.ssr_mode = False
        self.node_server_name = self.node_port = self.node_process = None

        self.i18n_instance = i18n

        if app_kwargs is None:
            app_kwargs = {}

        self.server_app = self.app = App.create_app(
            self,
            auth_dependency=auth_dependency,
            app_kwargs=app_kwargs,
            strict_cors=strict_cors,
            ssr_mode=self.ssr_mode,
            mcp_server=False,
        )
        if self.mcp_error and not quiet:
            print(self.mcp_error)

        self.config = self.get_config_file()

        if self.is_running:
            if not isinstance(self.local_url, str):
                raise ValueError(f"Invalid local_url: {self.local_url}")
            if not (quiet):
                print(
                    "Rerunning server... use `close()` to stop if you need to change `launch()` parameters.\n----"
                )
        else:
            server_name = "xxx"
            server_port = 99999
            local_url = ""
            server = None
            if instance_id is not None and kernel_client_id is not None:
                GRADIO_SERVER[f"{instance_id}@{kernel_client_id}"] = self.app

            self.server_name = server_name
            self.local_url = local_url
            self.local_api_url = f"{self.local_url.rstrip('/')}{API_PREFIX}/"
            self.server_port = server_port
            self.server = server
            self.is_running = True
            self.is_colab = False
            self.is_hosted_notebook = False
            self.share_server_address = None
            self.share_server_protocol = "http"
            self.share_server_tls_certificate = None
            self.has_launched = True
            if self.mcp_server_obj:
                self.mcp_server_obj._local_url = self.local_url

            self.protocol = "http"

            self._queue.set_server_app(self.server_app)

            self.run_startup_events()
            asyncio.create_task(self.run_extra_startup_events())

        self.share = False

        self.enable_monitoring = False

        self.share_url = None

        return TupleNoPrint((self.server_app, self.local_url, self.share_url))

    blocks.Blocks.launch = launch
