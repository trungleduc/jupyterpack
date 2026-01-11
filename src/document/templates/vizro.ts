export const VIZRO_APP = `
# This example is taken from the vizro official documentation (https://vizro.readthedocs.io/en/stable/pages/tutorials/quickstart-tutorial)

import vizro.plotly.express as px
from vizro import Vizro
import vizro.models as vm

df = px.data.iris()

page = vm.Page(
    title="My first dashboard",
    components=[
        vm.Graph(
            figure=px.scatter(df, x="sepal_length", y="petal_width", color="species")
        ),
        vm.Graph(figure=px.histogram(df, x="sepal_width", color="species")),
    ],
    controls=[
        vm.Filter(column="species"),
    ],
)

dashboard = vm.Dashboard(pages=[page])
Vizro().build(dashboard).run()

`;
