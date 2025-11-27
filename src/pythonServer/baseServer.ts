import { KernelExecutor } from './kernelExecutor';
import websocketPatch from '../websocket/websocket.js?raw';
import {
  IDict,
  IBasePythonServer,
  IKernelExecutor,
  JupyterPackFramework
} from '../type';
import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  base64ToString,
  isBinaryContentType,
  stringOrNone
} from '../tools';

export abstract class BasePythonServer implements IBasePythonServer {
  constructor(options: KernelExecutor.IOptions) {
    this._kernelExecutor = new KernelExecutor(options);
    this._wsPatch = websocketPatch.replaceAll('"use strict";', '');
  }

  abstract reloadPythonServer(options: {
    entryPath?: string;
    initCode?: string;
  }): Promise<void>;

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  get kernelExecutor() {
    return this._kernelExecutor;
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.disposePythonServer()
      .then(() => {
        this._kernelExecutor.dispose();
      })
      .catch(console.error);
  }
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
    await this._kernelExecutor.executeCode({ code: patchCode });
  }

  async disposePythonServer(): Promise<void> {
    await this.kernelExecutor.executeCode({
      code: `${this._server_var}.dispose()`
    });
    for (const element of this._openedWebsockets) {
      await this.closeWebsocket(element);
    }
  }

  getResponseFunctionFactory(options: {
    urlPath: string;
    method: string;
    headers: IDict;
    params?: string;
    content?: string;
  }) {
    const { method, urlPath, headers, params, content } = options;
    const code = `await ${this._server_var}.get_response("${method}", "${urlPath}", headers=${JSON.stringify(headers)} , content=${stringOrNone(content)}, params=${stringOrNone(params)})`;
    return code;
  }

  openWebsocketFunctionFactory(options: {
    instanceId: string;
    kernelId: string;
    wsUrl: string;
    protocol?: string;
  }): string {
    const { instanceId, kernelId, wsUrl, protocol } = options;
    const code = `await ${this._server_var}.open_ws("${instanceId}", "${kernelId}", "${wsUrl}", ${stringOrNone(protocol)})`;
    return code;
  }

  closeWebsocketFunctionFactory(options: {
    instanceId: string;
    kernelId: string;
    wsUrl: string;
  }): string {
    const { instanceId, kernelId, wsUrl } = options;
    const code = `await ${this._server_var}.close_ws("${instanceId}", "${kernelId}", "${wsUrl}")`;
    return code;
  }

  sendWebsocketMessageFunctionFactory(options: {
    instanceId: string;
    kernelId: string;
    wsUrl: string;
    message: string;
  }): string {
    const { instanceId, kernelId, wsUrl, message } = options;
    const code = `await ${this._server_var}.receive_ws_message("${instanceId}", "${kernelId}", "${wsUrl}", '''${message}''')`;
    return code;
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
        await this._kernelExecutor.executeCode({ code });
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
      await this._kernelExecutor.executeCode({ code });
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
      await this._kernelExecutor.executeCode({ code });
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
    const raw = await this._kernelExecutor.executeCode({ code }, true);
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
  protected readonly _openedWebsockets: {
    instanceId: string;
    kernelId: string;
    wsUrl: string;
  }[] = [];
  protected readonly _server_var = '__jupyterpack_python_server';

  private _kernelExecutor: IKernelExecutor;
  private _isDisposed: boolean = false;
  private _wsPatch: string;
}
