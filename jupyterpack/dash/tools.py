import os

DASH_SERVER = {}


def patch_dash(base_url: str, instance_id: str, kernel_client_id: str):
    import dash

    os.environ["DASH_URL_BASE_PATHNAME"] = base_url

    def patched_dash_run(self, *args, **kwargs):
        DASH_SERVER[f"{instance_id}@{kernel_client_id}"] = self

    dash.Dash.run = patched_dash_run


def get_dash_server(instance_id: str, kernel_client_id: str):
    return DASH_SERVER.get(f"{instance_id}@{kernel_client_id}", None)
