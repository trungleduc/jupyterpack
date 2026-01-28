export const MESOP_APP = `
# This example is taken from the mesop official repository (https://github.com/mesop-dev/mesop?tab=readme-ov-file#write-your-first-mesop-app-in-less-than-10-lines-of-code)

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


`;
