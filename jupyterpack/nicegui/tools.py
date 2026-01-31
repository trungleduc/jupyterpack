import asyncio
import os
from pathlib import Path

from starlette.routing import Route
from typing import Any, Callable, Literal, Optional, Union


NICEGUI_SERVER = {}


def get_nicegui_server(instance_id: str, kernel_client_id: str):
    return NICEGUI_SERVER.get(f"{instance_id}@{kernel_client_id}", None)


def patch_nicegui(base_url: str, instance_id: str, kernel_client_id: str):
    from fastapi.middleware.gzip import GZipMiddleware

    from nicegui import ui, core, slot, background_tasks, binding, Client, nicegui
    from nicegui.middlewares import (
        RedirectWithPrefixMiddleware,
        SetCacheControlMiddleware,
    )
    from nicegui.storage import set_storage_secret
    from nicegui.server import CustomServerConfig

    def run(
        root: Optional[Callable] = None,
        *,
        host: Optional[str] = None,
        port: Optional[int] = None,
        title: str = "NiceGUI",
        viewport: str = "width=device-width, initial-scale=1",
        favicon: Optional[Union[str, Path]] = None,
        dark: Optional[bool] = False,
        language="en-US",
        binding_refresh_interval: Optional[float] = 0.1,
        reconnect_timeout: float = 3.0,
        message_history_length: int = 1000,
        cache_control_directives: str = "public, max-age=31536000, immutable, stale-while-revalidate=31536000",
        gzip_middleware_factory: Optional[Callable] = GZipMiddleware,
        fastapi_docs: Union[bool, Any] = False,
        show: Union[bool, str] = False,
        on_air: Optional[Union[str, Literal[True]]] = None,
        native: bool = False,
        window_size: Optional[tuple[int, int]] = None,
        fullscreen: bool = False,
        frameless: bool = False,
        reload: bool = False,
        uvicorn_logging_level: str = "warning",
        uvicorn_reload_dirs: str = ".",
        uvicorn_reload_includes: str = "*.py",
        uvicorn_reload_excludes: str = ".*, .py[cod], .sw.*, ~*",
        tailwind: bool = True,
        prod_js: bool = True,
        endpoint_documentation: Literal["none", "internal", "page", "all"] = "none",
        storage_secret: Optional[str] = None,
        session_middleware_kwargs: Optional[dict[str, Any]] = None,
        show_welcome_message: bool = True,
        **kwargs: Any,
    ) -> None:
        if core.app.is_started:
            core.root = root
            return
        # if core.script_mode:
        #     if Client.page_routes:
        #         if (
        #             core.script_client
        #             and not core.script_client.content.default_slot.children
        #             and (
        #                 core.script_client._head_html or core.script_client._body_html  # pylint: disable=protected-access
        #             )
        #         ):
        #             raise RuntimeError(
        #                 "ui.add_head_html, ui.add_body_html, or ui.add_css has been called inside the global scope while using ui.page.\n"
        #                 "Consider using shared=True for this call to add the code to all pages.\n"
        #                 "Alternatively, to add the code to a specific page, move the call into the page function."
        #             )
        #         raise RuntimeError(
        #             "ui.page cannot be used in NiceGUI scripts when UI is defined in the global scope.\n"
        #             "To use multiple pages, either move all UI into page functions or use ui.sub_pages."
        #         )

        #     if helpers.is_pytest():
        #         raise RuntimeError(
        #             "Script mode is not supported in pytest. "
        #             "Please pass a root function to ui.run() or use page decorators."
        #         )
        #     if core.app.is_started:
        #         return

        #     def run_script() -> None:
        #         if not sys.argv or not sys.argv[0] or not helpers.is_file(sys.argv[0]):
        #             raise RuntimeError(
        #                 "Script mode requires a valid script file to re-execute.\n"
        #                 "This error occurs when running code interactively (e.g., Shift-Enter in an IDE).\n"
        #                 "To fix this, either:\n"
        #                 '  1. Run the complete file instead of a selection (e.g., "python script.py")\n'
        #                 "  2. Use a root function: wrap your UI code in a function and pass it to ui.run(root=my_function)"
        #             )
        #         runpy.run_path(sys.argv[0], run_name="__main__")

        #     root = run_script
        #     assert core.script_client is not None
        #     core.script_client.delete()

        core.app.config.add_run_config(
            reload=reload,
            title=title,
            viewport=viewport,
            favicon=favicon,
            dark=dark,
            language=language,
            binding_refresh_interval=binding_refresh_interval,
            reconnect_timeout=reconnect_timeout,
            message_history_length=message_history_length,
            cache_control_directives=cache_control_directives,
            tailwind=tailwind,
            prod_js=prod_js,
            show_welcome_message=show_welcome_message,
        )
        core.root = root
        core.app.config.endpoint_documentation = endpoint_documentation
        if gzip_middleware_factory is not None:
            core.app.add_middleware(gzip_middleware_factory)
        core.app.add_middleware(RedirectWithPrefixMiddleware)
        core.app.add_middleware(SetCacheControlMiddleware)

        for route in core.app.routes:
            if not isinstance(route, Route):
                continue
            if route.path.startswith("/_nicegui") and hasattr(route, "methods"):
                route.include_in_schema = endpoint_documentation in {"internal", "all"}
            if route.path == "/" or route.path in Client.page_routes.values():
                route.include_in_schema = endpoint_documentation in {"page", "all"}

        if fastapi_docs:
            if not core.app.docs_url:
                core.app.docs_url = "/docs"
            if not core.app.redoc_url:
                core.app.redoc_url = "/redoc"
            if not core.app.openapi_url:
                core.app.openapi_url = "/openapi.json"
            if isinstance(fastapi_docs, dict):
                core.app.title = fastapi_docs.get("title") or title
                core.app.summary = fastapi_docs.get("summary")
                core.app.description = fastapi_docs.get("description") or ""
                core.app.version = fastapi_docs.get("version") or "0.1.0"
                core.app.terms_of_service = fastapi_docs.get("terms_of_service")
                contact = fastapi_docs.get("contact")
                license_info = fastapi_docs.get("license_info")
                core.app.contact = dict(contact) if contact else None
                core.app.license_info = dict(license_info) if license_info else None
            core.app.setup()

        core.app.config.reload = reload = False

        port = 8080
        host = "0.0.0.0"

        protocol = "http"

        # NOTE: We save host and port in environment variables so the subprocess started in reload mode can access them.
        os.environ["NICEGUI_HOST"] = host
        os.environ["NICEGUI_PORT"] = str(port)
        os.environ["NICEGUI_PROTOCOL"] = protocol

        def split_args(args: str) -> list[str]:
            return [a.strip() for a in args.split(",")]

        config = CustomServerConfig(
            app=core.app,
            host=host,
            port=port,
            reload=reload,
            reload_includes=split_args(uvicorn_reload_includes) if reload else None,
            reload_excludes=split_args(uvicorn_reload_excludes) if reload else None,
            reload_dirs=split_args(uvicorn_reload_dirs) if reload else None,
            log_level=uvicorn_logging_level,
            ws="wsproto",
            **kwargs,
        )

        set_storage_secret(config.storage_secret, config.session_middleware_kwargs)

        if instance_id is not None and kernel_client_id is not None:
            NICEGUI_SERVER[f"{instance_id}@{kernel_client_id}"] = core.app

        core.sio.eio.ping_interval = max(core.app.config.reconnect_timeout * 0.8, 4)
        core.sio.eio.ping_timeout = max(core.app.config.reconnect_timeout * 0.4, 2)

        core.loop = asyncio.get_running_loop()
        core.app.start()
        background_tasks.create(binding.refresh_loop(), name="refresh bindings")
        core.app.timer(10, Client.prune_instances)
        core.app.timer(10, slot.Slot.prune_stacks)
        core.app.timer(10, nicegui.prune_tab_storage)
        if core.app.storage.secret is not None:
            core.app.timer(10, nicegui.nicegui.prune_user_storage)

    ui.run = run
