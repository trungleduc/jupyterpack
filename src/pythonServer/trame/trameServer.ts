import { IPythonServerInitOptions, JupyterPackFramework } from '../../type';
import { BasePythonServer } from '../baseServer';

export class TrameServer extends BasePythonServer {
  framework = JupyterPackFramework.TRAME;
  async init(options: IPythonServerInitOptions) {
    const mergedOptions: IPythonServerInitOptions = {
      ...options,
      dependencies: this.mergeDependencies(options.dependencies, {})
    };
    await super.init(mergedOptions);

    const { initCode, instanceId, kernelClientId } = options;

    const baseURL = this.buildBaseURL({
      instanceId,
      kernelClientId
    });
    const bootstrapCode = `
    from jupyterpack.common import set_base_url_env
    from jupyterpack.trame import patch_trame
    set_base_url_env("${baseURL}")
    patch_trame("${baseURL}", "${instanceId}", "${kernelClientId}")
    `;
    await this.kernelExecutor.executeCode({ code: bootstrapCode });
    if (initCode) {
      const origin = window.location.origin;
      const initCodeWithUrl = initCode.replaceAll('{{base_url}}', baseURL);
      await this.kernelExecutor.executeCode({ code: initCodeWithUrl });
      const loaderCode = `
      from jupyterpack.trame import TrameServer
      ${this._server_var} = TrameServer("${baseURL}", "${instanceId}", "${kernelClientId}", "${origin}")
      `;

      await this.kernelExecutor.executeCode({ code: loaderCode });
    }
  }

  async reloadPythonServer(options: {
    entryPath?: string;
    initCode?: string;
  }): Promise<void> {
    //
  }
}
