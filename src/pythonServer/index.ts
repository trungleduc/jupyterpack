import { IKernelExecutor, JupyterPackFramework } from '../type';
import { DashServer } from './dash/dashServer';
import { KernelExecutor } from './kernelExecutor';
import { ShinyServer } from './shiny/shinyServer';
import { StreamlitServer } from './streamlit/streamlitServer';
import { TornadoServer } from './tornado/tornadoServer';

type KernelExecutorConstructor = new (
  options: KernelExecutor.IOptions
) => IKernelExecutor;

export const PYTHON_SERVER = new Map<
  JupyterPackFramework,
  KernelExecutorConstructor
>([
  [JupyterPackFramework.DASH, DashServer],
  [JupyterPackFramework.STREAMLIT, StreamlitServer],
  [JupyterPackFramework.TORNADO, TornadoServer],
  [JupyterPackFramework.SHINY, ShinyServer]
]);
