import tornado
import os

base_url = os.getenv("JUPYTERPACK_BASE_URL")


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.write("Hello, world")


def make_app():
    return tornado.web.Application(
        [
            (r"{{base_url}}", MainHandler),
        ]
    )


app = make_app()
