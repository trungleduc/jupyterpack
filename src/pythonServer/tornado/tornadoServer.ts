import { JupyterPackFramework } from '../../type';
import { BasePythonServer } from '../baseServer';

export class TornadoServer extends BasePythonServer {
  framework = JupyterPackFramework.TORNADO;
  async init(options: {
    initCode?: string;
    instanceId: string;
    kernelClientId: string;
  }) {
    await super.init(options);
    const { initCode, instanceId, kernelClientId } = options;

    const baseURL = this.buildBaseURL({
      instanceId,
      kernelClientId
    });
    const bootstrapCode = `
    from jupyterpack.common import set_base_url_env, patch_tornado
    set_base_url_env("${baseURL}")
    patch_tornado()

    `;
    await this.kernelExecutor.executeCode({ code: bootstrapCode });
    if (initCode) {
      const initCodeWithUrl = initCode.replaceAll('{{base_url}}', baseURL);
      await this.kernelExecutor.executeCode({ code: initCodeWithUrl });
      const loaderCode = `
      from jupyterpack.tornado import TornadoServer
      ${this._server_var} = TornadoServer(app, "${baseURL}")
      `;

      await this.kernelExecutor.executeCode({ code: loaderCode });
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
      ${this._server_var}.dispose()
      ${this._server_var}.reload(app)
      `;
      await this.kernelExecutor.executeCode({ code: reloadCode }, true);
    }
  }
}
