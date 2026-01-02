# This example is taken from the Panel official documentation (https://github.com/holoviz/panel?tab=readme-ov-file#interactive-data-apps)

import panel as pn


def model(n=5):
    return "⭐" * n


pn.extension(template="fast")

slider = pn.widgets.IntSlider(value=5, start=1, end=5)

interactive_model = pn.bind(model, n=slider)

layout = pn.Column(slider, interactive_model).servable()
