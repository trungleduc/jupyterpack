import base64
import json

try:
    # Check if __jupyterpack_tornado_instance defined from previous run
    __jupyterpack_tornado_instance
except NameError:
    __jupyterpack_tornado_instance = {
        "tornado_bridge": None,
        "tornado_server": None,
    }

def __jupyterpack_tornado_dispose():
    global __jupyterpack_tornado_instance
    __jupyterpack_tornado_instance = {
        "tornado_bridge": None,
        "tornado_server": None,
    }



async def __jupyterpack_tornado_open_ws(
    instance_id: str, kernel_client_id: str, ws_url: str, protocols_str: str | None
):
    tornado_bridge = __jupyterpack_tornado_instance["tornado_bridge"]
    if tornado_bridge is None:
        raise Exception("Missing tornado instance")
    await tornado_bridge.open_ws(instance_id, kernel_client_id, ws_url, protocols_str)


async def __jupyterpack_tornado_receive_ws_message(
    instance_id: str, kernel_client_id: str, ws_url: str, payload_message: str
):
    tornado_bridge = __jupyterpack_tornado_instance["tornado_bridge"]
    if tornado_bridge is None:
        raise Exception("Missing tornado instance")
    await tornado_bridge.receive_ws_message_from_js(
        instance_id, kernel_client_id, ws_url, payload_message
    )


async def __jupyterpack_tornado_get_response(
    method, url, headers, content=None, params=None
):
    global __jupyterpack_tornado_instance
    if not __jupyterpack_tornado_instance["tornado_server"]:
        __jupyterpack_tornado_instance["tornado_server"] = app # noqa
        __jupyterpack_tornado_instance["tornado_bridge"] = TornadoBridge( # noqa
            app, "{{base_url}}" # noqa
        )

    tornado_bridge = __jupyterpack_tornado_instance["tornado_bridge"]
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
