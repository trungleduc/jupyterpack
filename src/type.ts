import { KernelMessage } from '@jupyterlab/services';
import { IDisposable } from '@lumino/disposable';

export interface IDict<T = any> {
  [key: string]: T;
}

export enum JupyterPackFramework {
  REACT = 'react',
  DASH = 'dash'
}
export interface IJupyterPackFileFormat {
  entry: string;
  framework: JupyterPackFramework;
  name?: string;
  metadata?: IDict;
}

export enum MessageAction {
  INIT = 'INIT'
}

export interface IKernelExecutorParams {
  method: string;
  urlPath: string;
  headers: IDict;
  params?: string;
  requestBody?: ArrayBuffer;
}
export interface IKernelExecutor extends IDisposable {
  getResponse(options: IKernelExecutorParams): Promise<IDict>;
  executeCode(
    code: KernelMessage.IExecuteRequestMsg['content']
  ): Promise<string>;
}

export interface IConnectionManager {
  registerConnection(
    kernelExecutor: IKernelExecutor
  ): Promise<{ instanceId: string; kernelClientId: string }>;
  generateResponse(
    option: { kernelClientId: string } & IKernelExecutorParams
  ): Promise<IDict | null>;
}
