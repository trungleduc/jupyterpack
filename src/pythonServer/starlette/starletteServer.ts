import { JupyterPackFramework } from '../../type';
import { BasePythonServer } from '../baseServer';

export class StarletteServer extends BasePythonServer {
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
      framework: JupyterPackFramework.STARLETTE
    });
    const bootstrapCode = `
    from jupyterpack.common import set_base_url_env
    set_base_url_env("${baseURL}")
    `;
    await this.kernelExecutor.executeCode({ code: bootstrapCode });
    if (initCode) {
      const initCodeWithUrl = initCode.replaceAll('{{base_url}}', baseURL);
      await this.kernelExecutor.executeCode({ code: initCodeWithUrl });
      const loaderCode = `
      from jupyterpack.asgi import AsgiServer
      ${this._server_var} = AsgiServer(app, "${baseURL}")
      `;

      await this.kernelExecutor.executeCode({ code: loaderCode });
    }
  }

  async disposePythonServer(): Promise<void> {
    await this.kernelExecutor.executeCode({
      code: `${this._server_var}.dispose()`
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
      await this.kernelExecutor.executeCode({
        code: initCode.replaceAll('{{base_url}}', this._baseUrl ?? '')
      });
      const reloadCode = `
      await ${this._server_var}.dispose()
      ${this._server_var}.reload(app)
      `;
      await this.kernelExecutor.executeCode({ code: reloadCode }, true);
    }
  }
}
