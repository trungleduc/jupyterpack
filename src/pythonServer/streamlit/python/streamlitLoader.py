import tempfile
import base64
import json


def create_app():
    from streamlit import config
    import streamlit.web.server.server as st_server
    config.set_option("server.baseUrlPath", "{{base_url}}")

    config.set_option("server.port", 3001)
    config.set_option("server.enableCORS", False)
    config.set_option("server.enableXsrfProtection", False)

    st_script = '''
    {{script_content}}
    '''

    with tempfile.NamedTemporaryFile(delete=False, mode='w', suffix='.py') as tmp:
        tmp.write(st_script)
        script_path = tmp.name 

    streamlit_server = st_server.Server(script_path, True)

    return streamlit_server

__jupyterpack_tornado_bridge = None

async def __jupyterpack_streamlit_get_response(
    method, url, headers, content=None, params=None
):

    global __jupyterpack_tornado_bridge
    if not __jupyterpack_tornado_bridge:
        streamlit_server = create_app()
        app = streamlit_server._create_app()
        await streamlit_server._runtime.start()
        __jupyterpack_tornado_bridge = TornadoBridge(app, "{{base_url}}") # noqa

    req_dict= {'method': method, 'url': url, 'headers': list(headers.items()), 'body': content}
    
    try:
        res_body, res_headers, res_status = await __jupyterpack_tornado_bridge.fetch(req_dict)
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
