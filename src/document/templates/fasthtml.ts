export const FASTHTML_APP = `
from fasthtml.common import Div, P, fast_app

app, rt = fast_app()


@rt("/")
async def get():
    return Div(P("Hello World!"))

`;
