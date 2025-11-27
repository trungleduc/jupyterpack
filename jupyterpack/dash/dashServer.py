from ..wsgi.wsgiServer import WsgiServer


class DashServer(WsgiServer):
    def __init__(self, dash_app, base_url):
        super().__init__(dash_app.server, base_url)

    def reload(self, dash_app):
        return super().reload(dash_app.server)
