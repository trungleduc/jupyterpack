import base64
import json

try:
    # Check if __jupyterpack_streamlit_instance defined from previous run
    __jupyterpack_streamlit_instance
except NameError:
    __jupyterpack_streamlit_instance = {
        "tornado_bridge": None,
        "streamlit_server": None,
    }


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


async def __jupyterpack_streamlit_get_response(
    method, url, headers, content=None, params=None
):
    global __jupyterpack_streamlit_instance
    if not __jupyterpack_streamlit_instance["streamlit_server"]:
        streamlit_server = create_app("{{base_url}}", """{{script_content}}""")  # noqa
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

    try:
        res_body, res_headers, res_status = await tornado_bridge.fetch(req_dict)
        response = {
            "headers": dict(res_headers),
            "content": res_body,
            "status_code": res_status,
            "original_request": {
                "method": method,
                "url": url,
                "params": params,
                "headers": headers,
            },
        }
    except Exception as e:
        response = {
            "headers": {},
            "content": str(e),
            "status_code": 500,
            "original_request": {
                "method": method,
                "url": url,
                "params": params,
                "headers": headers,
            },
        }
    json_str = json.dumps(response)
    b64_str = base64.b64encode(json_str.encode("utf-8")).decode("utf-8")
    return b64_str
