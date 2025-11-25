import { IBasePythonServer, JupyterPackFramework } from '../type';
import { DashServer } from './dash/dashServer';
import { KernelExecutor } from './kernelExecutor';
import { ShinyServer } from './shiny/shinyServer';
import { StreamlitServer } from './streamlit/streamlitServer';
import { TornadoServer } from './tornado/tornadoServer';

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
  [JupyterPackFramework.SHINY, ShinyServer]
]);
