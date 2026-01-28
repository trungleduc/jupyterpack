from .tools import get_dash_server
from ..wsgi.wsgiServer import WsgiServer


class DashServer(WsgiServer):
    def __init__(
        self,
        maybe_dash_app=None,
        base_url=None,
        instance_id=None,
        kernel_client_id=None,
        origin=None,
    ):
        dash_app = self._get_dash_app(maybe_dash_app, instance_id, kernel_client_id)
        super().__init__(dash_app.server, base_url, origin)

    def reload(self, maybe_dash_app=None, instance_id=None, kernel_client_id=None):
        dash_app = self._get_dash_app(maybe_dash_app, instance_id, kernel_client_id)
        return super().reload(dash_app.server)

    @staticmethod
    def _get_dash_app(maybe_dash_app, instance_id, kernel_client_id):
        from dash import Dash

        if (
            maybe_dash_app is None
            or not isinstance(maybe_dash_app, Dash)
            or maybe_dash_app.server is None
        ):
            if instance_id is None or kernel_client_id is None:
                raise ValueError("Missing instance_id or kernel_client_id")
            maybe_dash_app = get_dash_server(instance_id, kernel_client_id)

        if maybe_dash_app is None:
            raise ValueError("Dash app not found")

        return maybe_dash_app
