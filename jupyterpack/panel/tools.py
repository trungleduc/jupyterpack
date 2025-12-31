from ..common.patch import IS_WASM


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

        def bind_sockets(address, port):
            return [FakeSocket()], 6789

        bokeh.server.server.bind_sockets = bind_sockets
