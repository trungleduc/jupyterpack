import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { KernelMessage, Session } from '@jupyterlab/services';
import stripAnsi from 'strip-ansi';
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  base64ToString,
  isBinaryContentType
} from '../tools';
import { IDict, IKernelExecutor, JupyterPackFramework } from '../type';
import websocketPatch from '../websocket/websocket.js?raw';

export abstract class KernelExecutor implements IKernelExecutor {
  constructor(options: KernelExecutor.IOptions) {
    this._sessionConnection = options.sessionConnection;
    this._wsPatch = websocketPatch.replaceAll('"use strict";', '');
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  abstract disposePythonServer(): Promise<void>;
  abstract reloadPythonServer(options: {
    entryPath?: string;
    initCode?: string;
  }): Promise<void>;

  abstract getResponseFunctionFactory(options: {
    urlPath: string;
    method: string;
    headers: IDict;
    params?: string;
    content?: string;
  }): string;

  async init(options: {
    entryPath?: string;
    initCode?: string;
    instanceId: string;
    kernelClientId: string;
  }): Promise<void> {
    const patchCode = `
    from jupyterpack.common import patch_all
    patch_all()
    `;
    await this.executeCode({ code: patchCode });
  }

  openWebsocketFunctionFactory(options: {
    instanceId: string;
    kernelId: string;
    wsUrl: string;
    protocol?: string;
  }): string | undefined {
    return undefined;
  }

  closeWebsocketFunctionFactory(options: {
    instanceId: string;
    kernelId: string;
    wsUrl: string;
    protocol?: string;
  }): string | undefined {
    return undefined;
  }

  sendWebsocketMessageFunctionFactory(options: {
    instanceId: string;
    kernelId: string;
    wsUrl: string;
    message: string;
  }): string | undefined {
    return undefined;
  }

  async openWebsocket(options: {
    instanceId: string;
    kernelId: string;
    wsUrl: string;
    protocol?: string;
  }): Promise<void> {
    const code = this.openWebsocketFunctionFactory(options);
    if (code) {
      try {
        await this.executeCode({ code });
        this._openedWebsockets.push(options);
      } catch (e) {
        console.error('Failed to open websocket', e);
      }
    } else {
      throw new Error('Missing websocket open code');
    }
  }

  async closeWebsocket(options: {
    instanceId: string;
    kernelId: string;
    wsUrl: string;
  }): Promise<void> {
    const code = this.closeWebsocketFunctionFactory(options);
    if (code) {
      await this.executeCode({ code });
    } else {
      throw new Error('Missing websocket close code');
    }
  }

  async sendWebsocketMessage(options: {
    instanceId: string;
    kernelId: string;
    wsUrl: string;
    message: string;
  }): Promise<void> {
    const code = this.sendWebsocketMessageFunctionFactory(options);
    if (code) {
      await this.executeCode({ code });
    } else {
      throw new Error('Missing websocket send code');
    }
  }

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
    const raw = await this.executeCode({ code }, true);
    if (!raw) {
      throw new Error(`Missing response for ${urlPath}`);
    }
    const jsonStr = raw.replaceAll("'", '');
    const obj: {
      headers: string;
      status_code: number;
      content: string;
    } = JSON.parse(jsonStr);
    const responseHeaders: IDict<string> = JSON.parse(atob(obj.headers));
    const contentType: string | undefined =
      responseHeaders?.['Content-Type'] ?? responseHeaders?.['content-type'];
    let responseContent: string | Uint8Array;

    if (isBinaryContentType(contentType)) {
      responseContent = base64ToArrayBuffer(obj.content);
    } else {
      responseContent = base64ToString(obj.content);
    }

    if (contentType && contentType.toLowerCase().includes('text/html')) {
      responseContent = (responseContent as string).replace(
        '<head>',
        `<head>\n<script>\n${this._wsPatch}\n</script>\n`
      );
    }

    const decodedObj = {
      status_code: obj.status_code,
      headers: responseHeaders,
      content: responseContent
    };

    return decodedObj;
  }
  async executeCode(
    code: KernelMessage.IExecuteRequestMsg['content'],
    waitForResult?: boolean
  ): Promise<string | null> {
    const kernel = this._sessionConnection?.kernel;
    if (!kernel) {
      throw new Error('Session has no kernel.');
    }
    return new Promise<string | null>((resolve, reject) => {
      const future = kernel.requestExecute(code, false, undefined);
      let executeResult = '';
      future.onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
        const msgType = msg.header.msg_type;

        switch (msgType) {
          case 'execute_result': {
            if (waitForResult) {
              const content = (msg as KernelMessage.IExecuteResultMsg).content
                .data['text/plain'] as string;
              executeResult += content;
              resolve(executeResult);
            }
            break;
          }
          case 'stream': {
            const content = (msg as KernelMessage.IStreamMsg).content;
            if (content.text.length === 0) {
              break;
            }
            if (content.name === 'stderr') {
              console.error('Kernel stream:', content.text);
            } else {
              console.log('Kernel stream:', content.text);
            }
            break;
          }
          case 'error': {
            console.error(
              'Kernel operation failed',
              code.code,
              (msg.content as any).traceback
                .map((it: string) => stripAnsi(it))
                .join('\n')
            );

            reject(msg.content);
            break;
          }
          default:
            break;
        }
      };
      if (!waitForResult) {
        resolve(null);
        // future.dispose() # TODO
      }
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
    framework: JupyterPackFramework;
  }) {
    const { instanceId, kernelClientId, framework } = options;
    const fullLabextensionsUrl = PageConfig.getOption('fullLabextensionsUrl');

    const baseURL = URLExt.join(
      fullLabextensionsUrl,
      'jupyterpack/static',
      instanceId,
      framework,
      kernelClientId,
      '/'
    );
    this._baseUrl = baseURL;

    return baseURL;
  }

  protected _baseUrl: string | undefined;

  private _isDisposed: boolean = false;
  private _sessionConnection: Session.ISessionConnection;
  private _wsPatch: string;
  protected _openedWebsockets: {
    instanceId: string;
    kernelId: string;
    wsUrl: string;
  }[] = [];
}

export namespace KernelExecutor {
  export interface IOptions {
    sessionConnection: Session.ISessionConnection;
  }
}
