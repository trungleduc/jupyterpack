import { stringOrNone } from '../../tools';
import { IDict, JupyterPackFramework } from '../../type';
import { KernelExecutor } from '../kernelExecutor';

export class ShinyServer extends KernelExecutor {
  async init(options: {
    initCode?: string;
    instanceId: string;
    kernelClientId: string;
  }) {
    await super.init(options);
    const { initCode, instanceId, kernelClientId } = options;
    const baseURL = this.buildBaseURL({
      instanceId,
      kernelClientId,
      framework: JupyterPackFramework.SHINY
    });
    const bootstrapCode = `
    from jupyterpack.common import set_base_url_env
    set_base_url_env("${baseURL}")
    `;
    await this.executeCode({ code: bootstrapCode });
    if (initCode) {
      const initCodeWithUrl = initCode.replaceAll('{{base_url}}', baseURL);
      await this.executeCode({ code: initCodeWithUrl });
      const loaderCode = `
      from jupyterpack.asgi import AsgiServer
      ${this._SERVER_VAR} = AsgiServer(app, "${baseURL}")
      `;

      await this.executeCode({ code: loaderCode });
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
    const code = `await ${this._SERVER_VAR}.get_response("${method}", "${urlPath}", headers=${JSON.stringify(headers)} , content=${stringOrNone(content)}, params=${stringOrNone(params)})`;
    return code;
  }

  openWebsocketFunctionFactory(options: {
    instanceId: string;
    kernelId: string;
    wsUrl: string;
    protocol?: string;
  }): string {
    const { instanceId, kernelId, wsUrl, protocol } = options;
    const code = `await ${this._SERVER_VAR}.open_ws("${instanceId}", "${kernelId}", "${wsUrl}", ${stringOrNone(protocol)})`;
    return code;
  }

  closeWebsocketFunctionFactory(options: {
    instanceId: string;
    kernelId: string;
    wsUrl: string;
  }): string {
    const { instanceId, kernelId, wsUrl } = options;
    const code = `await ${this._SERVER_VAR}.close_ws("${instanceId}", "${kernelId}", "${wsUrl}")`;
    return code;
  }

  sendWebsocketMessageFunctionFactory(options: {
    instanceId: string;
    kernelId: string;
    wsUrl: string;
    message: string;
  }): string {
    const { instanceId, kernelId, wsUrl, message } = options;
    const code = `await ${this._SERVER_VAR}.receive_ws_message("${instanceId}", "${kernelId}", "${wsUrl}", '''${message}''')`;
    return code;
  }

  async disposePythonServer(): Promise<void> {
    await this.executeCode({
      code: `${this._SERVER_VAR}.dispose()`
    });
    for (const element of this._openedWebsockets) {
      await this.closeWebsocket(element);
    }
  }

  async reloadPythonServer(options: {
    entryPath?: string;
    initCode?: string;
  }): Promise<void> {
    const { initCode } = options;
    if (initCode) {
      await this.executeCode({
        code: initCode.replaceAll('{{base_url}}', this._baseUrl ?? '')
      });
      const reloadCode = `
      await ${this._SERVER_VAR}.dispose()
      ${this._SERVER_VAR}.reload(app)
      `;
      await this.executeCode({ code: reloadCode }, true);
    }
  }

  protected _SERVER_VAR = '__jupyterpack_asgi_server';
}
