import httpx, json, base64
__jupyterpack_dash_transport = httpx.WSGITransport(app=app.server)  # noqa


def __jupyterpack_dash_get_response(method, url, headers, content=None, params=None):
    decoded_content = None
    if content is not None:
        decoded_content = base64.b64decode(content)
        # decoded_content = content.decode()
    with httpx.Client(
        transport=__jupyterpack_dash_transport, base_url="http://testserver"
    ) as client:
        r = client.request(
            method, url, headers=headers, content=decoded_content, params=params
        )
        reply_headers = json.dumps(dict(r.headers)).encode("utf-8")
        response = {
            "headers": base64.b64encode(reply_headers).decode("ascii"),
            "content": base64.b64encode(r.content).decode("ascii"),
            "status_code": r.status_code,
        }
        json_str = json.dumps(response)
        return json_str
