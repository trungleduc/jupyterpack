import { IBasePythonServer, JupyterPackFramework } from '../type';
import { DashServer } from './dash/dashServer';
import { FastAPIServer } from './fastapi/fastapiServer';
import { FastHTMLServer } from './fasthtml/fasthtmlServer';
import { GradioServer } from './gradio/gradioServer';
import { KernelExecutor } from './kernelExecutor';
import { MesopServer } from './mesop/mesopServer';
import { PanelServer } from './panel/panelServer';
import { NiceGUIServer } from './nicegui/niceguiServer';
import { ShinyServer } from './shiny/shinyServer';
import { StarletteServer } from './starlette/starletteServer';
import { StreamlitServer } from './streamlit/streamlitServer';
import { TextualServer } from './textual/textualServer';
import { TornadoServer } from './tornado/tornadoServer';
import { VizroServer } from './vizro/vizroServer';

type BasePythonServerConstructor = new (
  options: KernelExecutor.IOptions
) => IBasePythonServer;

export const PYTHON_SERVER = new Map<
  JupyterPackFramework,
  BasePythonServerConstructor
>([
  [JupyterPackFramework.DASH, DashServer],
  [JupyterPackFramework.STREAMLIT, StreamlitServer],
  [JupyterPackFramework.TORNADO, TornadoServer],
  [JupyterPackFramework.SHINY, ShinyServer],
  [JupyterPackFramework.STARLETTE, StarletteServer],
  [JupyterPackFramework.PANEL, PanelServer],
  [JupyterPackFramework.TEXTUAL, TextualServer],
  [JupyterPackFramework.FASTAPI, FastAPIServer],
  [JupyterPackFramework.FASTHTML, FastHTMLServer],
  [JupyterPackFramework.VIZRO, VizroServer],
  [JupyterPackFramework.GRADIO, GradioServer],
  [JupyterPackFramework.MESOP, MesopServer],
  [JupyterPackFramework.NICEGUI, NiceGUIServer]
]);
