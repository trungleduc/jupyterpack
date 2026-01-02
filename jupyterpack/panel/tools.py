from ..common.patch import IS_WASM


async def create_panel_app(script_path: str, base_url: str):
    from panel.io.server import get_server

    tor_app = get_server(script_path, prefix=base_url)

    return tor_app._tornado


def patch_panel():
    if IS_WASM:
        import bokeh.server.server

        class FakeSocket:
            _fileno = 100

            def fileno(self):
                self._fileno += 1
                return self._fileno

            def close(self):
                pass

            def accept(self):
                pass

        def bind_sockets(address, port):
            return [FakeSocket()], 6789

        bokeh.server.server.bind_sockets = bind_sockets
