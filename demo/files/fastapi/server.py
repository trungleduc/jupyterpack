import resource

resource.getrusage = lambda *args, **kwargs: None
resource.RUSAGE_THREAD = 0
resource.RUSAGE_SELF = 0

from fasthtml.common import *

app,rt = fast_app()

@rt('/')
async def get(): return Div(P('Hello World!'), hx_get="/change")
