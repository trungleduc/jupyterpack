import base64
import json


__jupyterpack_tornado_bridge = TornadoBridge(app, "{{base_url}}")

async def __jupyterpack_streamlit_get_response(
    method, url, headers, content=None, params=None
):
    
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
