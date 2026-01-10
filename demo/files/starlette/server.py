from starlette.applications import Starlette
from starlette.responses import HTMLResponse
from starlette.routing import Route, WebSocketRoute


async def homepage(request):
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8" />
        <title>WS Demo</title>
    </head>
    <body>
        <h1>WebSocket Demo</h1>
        <pre id="log"></pre>
        <input id="msg" placeholder="Type a message..." />
        <button onclick="sendMsg()">Send</button>
        <button onclick="closeWs()">Closed</button>
        <script>
            const log = (msg) => {
                document.getElementById("log").textContent += msg + "\\n";
            };

            const ws = new WebSocket(`ws://${location.host}{{base_url}}ws`);

            ws.onopen = () => log("WebSocket connected");
            ws.onmessage = (ev) => log("Received: " + ev.data);
            ws.onclose = () => log("WebSocket closed");

            function sendMsg() {
                const val = document.getElementById("msg").value;
                ws.send(val);
                log("Sent: " + val);
            }
            function closeWs() {
                ws.close();
                log("Closed websocket");
            }
        </script>
    </body>
    </html>
    """
    return HTMLResponse(html)


async def ws_hello(websocket):
    await websocket.accept()
    await websocket.send_text("Hello from server!")

    try:
        while True:
            message = await websocket.receive_text()
            await websocket.send_text(f"Echo: {message}")
    except Exception:
        pass
    finally:
        await websocket.close()


app = Starlette(
    routes=[
        Route("/", homepage),
        WebSocketRoute("/ws", ws_hello),
    ]
)
