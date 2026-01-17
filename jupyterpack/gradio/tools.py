import asyncio
import json
import os
from pathlib import Path
import time
from typing import Any, Callable, Literal
from types import SimpleNamespace
import warnings
import gradio.blocks
import starlette.requests


wasm_utils = SimpleNamespace(IS_WASM=True)

GRADIO_SERVER = {}


def get_gradio_server(instance_id: str, kernel_client_id: str):
    return GRADIO_SERVER.get(f"{instance_id}@{kernel_client_id}", None)


def patch_gradio(base_url: str, instance_id: str, kernel_client_id: str):
    from gradio import analytics, networking, utils, blocks
    from gradio.route_utils import API_PREFIX
    from gradio.utils import (
        TupleNoPrint,
    )

    def launch(
        self,
        inline: bool | None = None,
        inbrowser: bool = False,
        share: bool | None = None,
        debug: bool = False,
        max_threads: int = 40,
        auth: (
            Callable[[str, str], bool] | tuple[str, str] | list[tuple[str, str]] | None
        ) = None,
        auth_message: str | None = None,
        prevent_thread_lock: bool = False,
        show_error: bool = False,
        server_name: str | None = None,
        server_port: int | None = None,
        *,
        height: int = 500,
        width: int | str = "100%",
        favicon_path: str | Path | None = None,
        ssl_keyfile: str | None = None,
        ssl_certfile: str | None = None,
        ssl_keyfile_password: str | None = None,
        ssl_verify: bool = True,
        quiet: bool = False,
        show_api: bool = not wasm_utils.IS_WASM,
        allowed_paths: list[str] | None = None,
        blocked_paths: list[str] | None = None,
        root_path: str | None = None,
        app_kwargs: dict[str, Any] | None = None,
        state_session_capacity: int = 10000,
        share_server_address: str | None = None,
        share_server_protocol: Literal["http", "https"] | None = None,
        share_server_tls_certificate: str | None = None,
        auth_dependency: Callable[[starlette.requests.Request], str | None]
        | None = None,
        max_file_size: str | int | None = None,
        enable_monitoring: bool | None = None,
        strict_cors: bool = True,
        node_server_name: str | None = None,
        node_port: int | None = None,
        ssr_mode: bool | None = None,
        pwa: bool | None = None,
        mcp_server: bool | None = None,
        _frontend: bool = True,
        i18n: Any | None = None,
    ) -> tuple[Any, str, str]:
        from gradio.routes import App

        if self._is_running_in_reload_thread:
            # We have already launched the demo
            return None, None, None  # type: ignore

        if not self.exited:
            self.__exit__()

        if auth is not None and auth_dependency is not None:
            raise ValueError(
                "You cannot provide both `auth` and `auth_dependency` in launch(). Please choose one."
            )
        if (
            auth
            and not callable(auth)
            and not isinstance(auth[0], tuple)
            and not isinstance(auth[0], list)
        ):
            self.auth = [auth]
        else:
            self.auth = auth

        if self.auth and not callable(self.auth):
            if any(not authenticable[0] for authenticable in self.auth):
                warnings.warn(
                    "You have provided an empty username in `auth`. Please provide a valid username."
                )
            if any(not authenticable[1] for authenticable in self.auth):
                warnings.warn(
                    "You have provided an empty password in `auth`. Please provide a valid password."
                )

        self.auth_message = auth_message
        self.show_error = show_error
        self.height = height
        self.width = width
        self.favicon_path = favicon_path
        self.ssl_verify = ssl_verify
        self.state_session_capacity = state_session_capacity
        if root_path is None:
            self.root_path = os.environ.get("GRADIO_ROOT_PATH", "")
        else:
            self.root_path = root_path
        self.show_api = show_api

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
        if self.ssr_mode:
            pass
        else:
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
            mcp_server=mcp_server,
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
            if wasm_utils.IS_WASM:
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
            self.is_colab = utils.colab_check()
            self.is_hosted_notebook = utils.is_hosted_notebook()
            self.share_server_address = share_server_address
            self.share_server_protocol = share_server_protocol or (
                "http" if share_server_address is not None else "https"
            )
            self.share_server_tls_certificate = share_server_tls_certificate
            self.has_launched = True
            if self.mcp_server_obj:
                self.mcp_server_obj._local_url = self.local_url

            self.protocol = (
                "https"
                if self.local_url.startswith("https") or self.is_colab
                else "http"
            )

            self._queue.set_server_app(self.server_app)

            if not wasm_utils.IS_WASM:
                pass
            else:
                self.run_startup_events()
                asyncio.create_task(self.run_extra_startup_events())

        if share is None:
            if self.is_colab or self.is_hosted_notebook:
                if not quiet:
                    print(
                        "It looks like you are running Gradio on a hosted Jupyter notebook, which requires `share=True`. Automatically setting `share=True` (you can turn this off by setting `share=False` in `launch()` explicitly).\n"
                    )
                self.share = True
            else:
                self.share = False
                share_env = os.getenv("GRADIO_SHARE")
                if share_env is not None and share_env.lower() == "true":
                    self.share = True
        else:
            self.share = share

        if enable_monitoring:
            print(
                f"Monitoring URL: {self.local_url}monitoring/{self.app.analytics_key}"
            )
        self.enable_monitoring = enable_monitoring in [True, None]

        if self.is_colab and not quiet:
            if debug:
                print(
                    "Colab notebook detected. This cell will run indefinitely so that you can see errors and logs. To turn off, set debug=False in launch()."
                )
            else:
                print(
                    "Colab notebook detected. To show errors in colab notebook, set debug=True in launch()"
                )
            if not self.share:
                print(
                    "Note: opening Chrome Inspector may crash demo inside Colab notebooks."
                )

        if self.share:
            self.share = False

        self.share_url = None

        mcp_subpath = API_PREFIX + "/mcp"
        if self.mcp_server:
            print(
                "\n🔨 Launching MCP server:"
                f"\n** Streamable HTTP URL: {self.share_url or self.local_url.rstrip('/')}/{mcp_subpath.lstrip('/')}/"
                f"\n* [Deprecated] SSE URL: {self.share_url or self.local_url.rstrip('/')}/{mcp_subpath.lstrip('/')}/sse"
            )

        if inline is None:
            inline = utils.ipython_check()
        if inline:
            try:
                from IPython.display import HTML, Javascript, display  # type: ignore

                if self.share and self.share_url:
                    while not networking.url_ok(self.share_url):
                        time.sleep(0.25)
                    artifact = HTML(
                        f'<div><iframe src="{self.share_url}" width="{self.width}" height="{self.height}" allow="autoplay; camera; microphone; clipboard-read; clipboard-write;" frameborder="0" allowfullscreen></iframe></div>'
                    )

                elif self.is_colab:
                    # modified from /usr/local/lib/python3.7/dist-packages/google/colab/output/_util.py within Colab environment
                    code = """(async (port, path, width, height, cache, element) => {
                            if (!google.colab.kernel.accessAllowed && !cache) {
                                return;
                            }
                            element.appendChild(document.createTextNode(''));
                            const url = await google.colab.kernel.proxyPort(port, {cache});

                            const external_link = document.createElement('div');
                            external_link.innerHTML = `
                                <div style="font-family: monospace; margin-bottom: 0.5rem">
                                    Running on <a href=${new URL(path, url).toString()} target="_blank">
                                        https://localhost:${port}${path}
                                    </a>
                                </div>
                            `;
                            element.appendChild(external_link);

                            const iframe = document.createElement('iframe');
                            iframe.src = new URL(path, url).toString();
                            iframe.height = height;
                            iframe.allow = "autoplay; camera; microphone; clipboard-read; clipboard-write;"
                            iframe.width = width;
                            iframe.style.border = 0;
                            element.appendChild(iframe);
                        })""" + "({port}, {path}, {width}, {height}, {cache}, window.element)".format(
                        port=json.dumps(self.server_port),
                        path=json.dumps("/"),
                        width=json.dumps(self.width),
                        height=json.dumps(self.height),
                        cache=json.dumps(False),
                    )

                    artifact = Javascript(code)
                else:
                    artifact = HTML(
                        f'<div><iframe src="{self.local_url}" width="{self.width}" height="{self.height}" allow="autoplay; camera; microphone; clipboard-read; clipboard-write;" frameborder="0" allowfullscreen></iframe></div>'
                    )
                self.artifact = artifact
                display(artifact)
            except ImportError:
                pass

        if getattr(self, "analytics_enabled", False):
            data = {
                "launch_method": "browser" if inbrowser else "inline",
                "is_google_colab": self.is_colab,
                "is_sharing_on": self.share,
                "is_space": self.space_id is not None,
                "mode": self.mode,
            }
            analytics.launched_analytics(self, data)

        return TupleNoPrint((self.server_app, self.local_url, self.share_url))  # type: ignore

    blocks.Blocks.launch = launch
