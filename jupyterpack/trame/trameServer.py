from ..tornado.tornadoServer import TornadoServer

from .tools import get_trame_server


class TrameServer(TornadoServer):
    def __init__(
        self,
        base_url=None,
        instance_id=None,
        kernel_client_id=None,
        origin=None,
    ):
        tornado_app = self._get_trame_app(instance_id, kernel_client_id)
        super().__init__(tornado_app, base_url, origin)

    @staticmethod
    def _get_trame_app(instance_id, kernel_client_id):
        if instance_id is None or kernel_client_id is None:
            raise ValueError("Missing instance_id or kernel_client_id")
        trame_app = get_trame_server(instance_id, kernel_client_id)

        if trame_app is None:
            raise ValueError("Trame app not found")

        return trame_app
