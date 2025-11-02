import json
from streamlit import config
import streamlit.web.server.server as st_server
from streamlit.runtime.runtime import Runtime

try:
    # Check if __jupyterpack_streamlit_instance defined from previous run
    __jupyterpack_streamlit_instance
except NameError:
    __jupyterpack_streamlit_instance = {
        "tornado_bridge": None,
        "streamlit_server": None,
    }


def __jupyterpack_create_streamlit_app(base_url, script_path):
    if Runtime._instance is not None:
        Runtime._instance.stop()
        Runtime._instance = None
    config.set_option("server.baseUrlPath", base_url)

    config.set_option("server.port", 6789)
    config.set_option("server.enableCORS", False)
    config.set_option("server.enableXsrfProtection", False)

    streamlit_server = st_server.Server(script_path, True)
    return streamlit_server


def __jupyterpack_streamlit_dispose():
    global __jupyterpack_streamlit_instance
    streamlit_server = __jupyterpack_streamlit_instance.get("streamlit_server", None)
    if streamlit_server:
        streamlit_server._runtime.stop()

    __jupyterpack_streamlit_instance = {
        "tornado_bridge": None,
        "streamlit_server": None,
    }
    del streamlit_server


async def __jupyterpack_streamlit_open_ws(
    instance_id: str, kernel_client_id: str, ws_url: str, protocols_str: str | None
):
    tornado_bridge = __jupyterpack_streamlit_instance["tornado_bridge"]
    if tornado_bridge is None:
        raise Exception("Missing tornado instance")
    await tornado_bridge.open_ws(instance_id, kernel_client_id, ws_url, protocols_str)


async def __jupyterpack_streamlit_receive_ws_message(
    instance_id: str, kernel_client_id: str, ws_url: str, payload_message: str
):
    tornado_bridge = __jupyterpack_streamlit_instance["tornado_bridge"]
    if tornado_bridge is None:
        raise Exception("Missing tornado instance")
    await tornado_bridge.receive_ws_message_from_js(
        instance_id, kernel_client_id, ws_url, payload_message
    )


async def __jupyterpack_streamlit_get_response(
    method, url, headers, content=None, params=None
):
    global __jupyterpack_streamlit_instance
    if not __jupyterpack_streamlit_instance["streamlit_server"]:
        streamlit_server = __jupyterpack_create_streamlit_app(
            "{{base_url}}", "{{script_path}}"
        )  # noqa
        app = streamlit_server._create_app()
        await streamlit_server._runtime.start()
        __jupyterpack_streamlit_instance["streamlit_server"] = streamlit_server
        __jupyterpack_streamlit_instance["tornado_bridge"] = TornadoBridge(
            app, "{{base_url}}"
        )

    tornado_bridge = __jupyterpack_streamlit_instance["tornado_bridge"]
    req_dict = {
        "method": method,
        "url": url,
        "headers": list(headers.items()),
        "body": content,
    }

    response = await tornado_bridge.fetch(req_dict)
    json_str = json.dumps(response)
    return json_str


async def __jupyterpack_reload_streamlit_app():
    __jupyterpack_streamlit_dispose()
    streamlit_server = __jupyterpack_create_streamlit_app(
        "{{base_url}}", "{{script_path}}"
    )  # noqa
    app = streamlit_server._create_app()
    await streamlit_server._runtime.start()
    __jupyterpack_streamlit_instance["streamlit_server"] = streamlit_server
    __jupyterpack_streamlit_instance["tornado_bridge"] = TornadoBridge(
        app, "{{base_url}}"
    )
    return True
