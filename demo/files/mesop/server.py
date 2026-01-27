import mesop as me
import mesop.labs as mel


@me.page(
    path="/",
    title="Text to Text Example"
)
def app():
    mel.text_to_text(
        upper_case_stream,
        title="Text to Text Example",
    )


def upper_case_stream(s: str):
    return "Echo: " + s.capitalize()
