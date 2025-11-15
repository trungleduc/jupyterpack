from starlette.applications import Starlette
from starlette.responses import HTMLResponse
from starlette.routing import Route


async def homepage(request):
    return HTMLResponse(
        "<html><head></head><body><h1>Hello, world!</h1>This is a starlette demo. If you put an <code>app.py</code> in the root of your home directory, you can write your own starlette app.</body></html>"
    )


app = Starlette(
    debug=True,
    routes=[
        Route("{{base_url}}", homepage),
    ],
)