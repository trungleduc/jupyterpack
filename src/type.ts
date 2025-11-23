import { DocumentWidget } from '@jupyterlab/docregistry';
import { KernelMessage } from '@jupyterlab/services';
import { IDisposable } from '@lumino/disposable';
import { IWidgetTracker } from '@jupyterlab/apputils';
import { ISignal } from '@lumino/signaling';

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
  STREAMLIT = 'streamlit',
  TORNADO = 'tornado',
  SHINY = 'shiny'
}
export interface IJupyterPackFileFormat {
  entry: string;
  framework: JupyterPackFramework;
  name?: string;
  metadata?: {
    autoreload?: boolean;
  };
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
  closeWebsocket(options: {
    instanceId: string;
    kernelId: string;
    wsUrl: string;
  }): Promise<void>;
  sendWebsocketMessage(options: {
    instanceId: string;
    kernelId: string;
    wsUrl: string;
    message: string;
  }): Promise<void>;
  executeCode(
    code: KernelMessage.IExecuteRequestMsg['content'],
    waitForResult?: boolean
  ): Promise<string | null>;
  init(options: {
    entryPath?: string;
    initCode?: string;
    instanceId: string;
    kernelClientId: string;
  }): Promise<void>;
  disposePythonServer(): Promise<void>;
  reloadPythonServer(options: {
    entryPath?: string;
    initCode?: string;
  }): Promise<void>;
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

export type IJupyterpackDocTracker = IWidgetTracker<DocumentWidget>;

export interface IPythonWidgetModel extends IDisposable {
  connectionManager: IConnectionManager;
  serverReloaded: ISignal<IPythonWidgetModel, void>;
  kernelStatusChanged: ISignal<IPythonWidgetModel, 'started' | 'stopped'>;
  reload(): Promise<void>;
  initialize(): Promise<
    | {
        success: true;
        instanceId: string;
        kernelClientId: string;
        rootUrl: string;
        framework: JupyterPackFramework;
      }
    | { success: false; error: string }
  >;
}
