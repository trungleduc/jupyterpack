import { stringOrNone } from '../../tools';
import { IDict, JupyterPackFramework } from '../../type';
import { KernelExecutor } from '../kernelExecutor';

export class DashServer extends KernelExecutor {
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
      framework: JupyterPackFramework.DASH
    });
    await this.executeCode({
      code: `
      import os
      os.environ["DASH_URL_BASE_PATHNAME"] = "${baseURL}"
      `
    });
    if (initCode) {
      await this.executeCode({ code: initCode });
    }
    const loaderCode = `
      from jupyterpack.dash import DashServer
      ${this._DASH_SERVER_VAR} = DashServer(app, "${baseURL}")
      `;
    await this.executeCode({ code: loaderCode });
  }

  getResponseFunctionFactory(options: {
    urlPath: string;
    method: string;
    headers: IDict;
    params?: string;
    content?: string;
  }) {
    const { method, urlPath, headers, params, content } = options;
    const code = `${this._DASH_SERVER_VAR}.get_response("${method}", "${urlPath}", headers=${JSON.stringify(headers)} , content=${stringOrNone(content)}, params=${stringOrNone(params)})`;
    return code;
  }

  async disposePythonServer(): Promise<void> {
    await this.executeCode({ code: `${this._DASH_SERVER_VAR}.dispose()` });
  }

  async reloadPythonServer(options: {
    entryPath?: string;
    initCode?: string;
  }): Promise<void> {
    const { initCode } = options;
    if (initCode) {
      await this.executeCode({ code: initCode });
    }
    await this.executeCode(
      { code: `${this._DASH_SERVER_VAR}.reload(app)` },
      true
    );
  }

  private _DASH_SERVER_VAR = '__jupyterpack_dash_server';
}
