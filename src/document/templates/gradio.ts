export const GRADIO_APP = `
# This example is taken from the Panel official documentation (https://github.com/gradio-app/gradio?tab=readme-ov-file#building-your-first-demo)

import gradio as gr


def greet(name, intensity):
    return "Hello, " + name + "!" * int(intensity)


demo = gr.Interface(
    fn=greet,
    inputs=["text", "slider"],
    outputs=["text"],
)

demo.launch()

`;
