import { IPythonServerInitOptions, JupyterPackFramework } from '../../type';
import { BasePythonServer } from '../baseServer';
import { DEPENDENCIES } from './deps';

export class DashServer extends BasePythonServer {
  framework = JupyterPackFramework.DASH;

  async init(options: IPythonServerInitOptions) {
    const mergedOptions: IPythonServerInitOptions = {
      ...options,
      dependencies: this.mergeDependencies(options.dependencies, DEPENDENCIES)
    };
    await super.init(mergedOptions);

    const { initCode, instanceId, kernelClientId } = options;

    const baseURL = this.buildBaseURL({
      instanceId,
      kernelClientId
    });
    await this.kernelExecutor.executeCode({
      code: `
      import os
      os.environ["DASH_URL_BASE_PATHNAME"] = "${baseURL}"
      `
    });
    if (initCode) {
      await this.kernelExecutor.executeCode({ code: initCode });
    }
    const loaderCode = `
      from jupyterpack.dash import DashServer
      ${this._server_var} = DashServer(app, "${baseURL}")
      `;
    await this.kernelExecutor.executeCode({ code: loaderCode });
  }

  async reloadPythonServer(options: {
    entryPath?: string;
    initCode?: string;
  }): Promise<void> {
    const { initCode } = options;
    if (initCode) {
      await this.kernelExecutor.executeCode({ code: initCode });
    }
    await this.kernelExecutor.executeCode(
      { code: `${this._server_var}.reload(app)` },
      true
    );
  }
}
