import { KernelMessage } from '@jupyterlab/services';
import { IDisposable } from '@lumino/disposable';

export interface IDict<T = any> {
  [key: string]: T;
}

export interface IBroadcastMessage {
  action:
    | 'message'
    | 'open'
    | 'close'
    | 'error'
    | 'send'
    | 'connected'
    | 'backend_message';
  dest: string;
  wsUrl: string;
  payload?: any;
}

export enum JupyterPackFramework {
  REACT = 'react',
  DASH = 'dash',
  STREAMLIT = 'streamlit'
}
export interface IJupyterPackFileFormat {
  entry: string;
  framework: JupyterPackFramework;
  name?: string;
  metadata?: IDict;
  rootUrl?: string;
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
  openWebsocket(options: {
    instanceId: string;
    kernelId: string;
    wsUrl: string;
    protocol?: string;
  }): Promise<void>;
  executeCode(
    code: KernelMessage.IExecuteRequestMsg['content'],
    waitForResult?: boolean
  ): Promise<string | null>;
  init(options: {
    initCode?: string;
    instanceId: string;
    kernelClientId: string;
  }): Promise<void>;
  disposePythonServer(): Promise<void>;
  getResponseFunctionFactory(options: {
    urlPath: string;
    method: string;
    headers: IDict;
    params?: string;
    content?: string;
  }): string;
}

export interface IConnectionManager {
  registerConnection(
    kernelExecutor: IKernelExecutor
  ): Promise<{ instanceId: string; kernelClientId: string }>;
  generateResponse(
    option: { kernelClientId: string } & IKernelExecutorParams
  ): Promise<IDict | null>;
}
