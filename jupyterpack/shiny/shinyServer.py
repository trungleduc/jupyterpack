from jupyterpack.asgi import AsgiServer


class ShinyServer(AsgiServer):
    def __init__(self, shiny_app, base_url: str, origin: str):
        self._shiny_app = shiny_app
        asgi_app = self._generate_asgi_app(shiny_app, base_url)
        super().__init__(asgi_app, base_url, origin)

    async def dispose(self):
        try:
            await self._shiny_app.stop()
        except Exception:
            pass
        self._shiny_app = None
        await super().dispose()

    def reload(self, shiny_app):
        self._shiny_app = shiny_app
        asgi_app = self._generate_asgi_app(shiny_app, self.base_url)
        return super().reload(asgi_app)

    def _generate_asgi_app(self, shiny_app, base_url: str):
        from starlette.applications import Starlette
        from starlette.routing import Mount

        routes = [Mount(base_url, app=shiny_app.starlette_app)]

        return Starlette(routes=routes)
