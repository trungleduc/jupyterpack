import { IKernelExecutor, JupyterPackFramework } from '../type';
import { DashServer } from './dashServer';
import { KernelExecutor } from './kernelExecutor';

type KernelExecutorConstructor = new (
  options: KernelExecutor.IOptions
) => IKernelExecutor;

export const PYTHON_SERVER = new Map<
  JupyterPackFramework,
  KernelExecutorConstructor
>([[JupyterPackFramework.DASH, DashServer]]);
