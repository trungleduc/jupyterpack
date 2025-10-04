import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { KernelMessage, Session } from '@jupyterlab/services';

import { arrayBufferToBase64 } from '../tools';
import { IDict, IKernelExecutor } from '../type';

export abstract class KernelExecutor implements IKernelExecutor {
  constructor(options: KernelExecutor.IOptions) {
    this._sessionConnection = options.sessionConnection;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  abstract getResponseFunctionFactory(options: {
    urlPath: string;
    method: string;
    headers: IDict;
    params?: string;
    content?: string;
  }): string;

  abstract init(options: {
    initCode?: string;
    instanceId: string;
    kernelClientId: string;
  }): Promise<void>;

  async getResponse(options: {
    method: string;
    urlPath: string;
    headers: IDict;
    requestBody?: ArrayBuffer;
    params?: string;
  }): Promise<IDict> {
    const { method, urlPath, requestBody, params, headers } = options;
    const content = requestBody ? arrayBufferToBase64(requestBody) : undefined;
    const code = this.getResponseFunctionFactory({
      method,
      urlPath,
      headers,
      params,
      content
    });
    const raw = await this.executeCode({ code });
    const jsonStr = atob(raw.slice(1, -1));
    const obj = JSON.parse(jsonStr);

    return obj;
  }
  async executeCode(
    code: KernelMessage.IExecuteRequestMsg['content']
  ): Promise<string> {
    const kernel = this._sessionConnection?.kernel;
    if (!kernel) {
      throw new Error('Session has no kernel.');
    }
    return new Promise<string>((resolve, reject) => {
      const future = kernel.requestExecute(code, false, undefined);
      const parentMsgid = future.msg.header.msg_id;
      let executeResult = '';
      future.onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
        const msgType = msg.header.msg_type;
        switch (msgType) {
          case 'execute_result': {
            const content = (msg as KernelMessage.IExecuteResultMsg).content
              .data['text/plain'] as string;
            executeResult += content;
            break;
          }
          case 'status': {
            if (
              (msg as KernelMessage.IStatusMsg).content.execution_state ===
                'idle' &&
              msg.parent_header.msg_id === parentMsgid
            ) {
              resolve(executeResult);
            }
            break;
          }
          case 'stream': {
            const content = (msg as KernelMessage.IStreamMsg).content.text;
            executeResult += content;
            break;
          }
          case 'error': {
            console.error('Kernel operation failed', msg.content);
            reject(msg.content);
            break;
          }
          default:
            break;
        }
      };
    });
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._sessionConnection.dispose();
  }

  protected buildBaseURL(options: {
    instanceId: string;
    kernelClientId: string;
  }) {
    const { instanceId, kernelClientId } = options;
    const labBaseUrl = PageConfig.getOption('baseUrl');
    const baseURL = URLExt.join(
      labBaseUrl,
      'extensions/jupyterpack/static',
      instanceId,
      'dash',
      kernelClientId,
      '/'
    );

    return baseURL;
  }

  private _isDisposed: boolean = false;
  private _sessionConnection: Session.ISessionConnection;
}

export namespace KernelExecutor {
  export interface IOptions {
    sessionConnection: Session.ISessionConnection;
  }
}
