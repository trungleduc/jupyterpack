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
      from jupyterpack.dash import patch_dash
      patch_dash("${baseURL}", "${instanceId}", "${kernelClientId}")
      `
    });
    if (initCode) {
      await this.kernelExecutor.executeCode({ code: initCode });
    }
    const loaderCode = `
      from jupyterpack.dash import DashServer
      
      ${this._server_var} = DashServer(globals().get("app", None), "${baseURL}", "${instanceId}", "${kernelClientId}")
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
    const reloadCode = `
      ${this._server_var}.reload(globals().get("app", None), "${this._instanceId}", "${this._kernelClientId}")
      `;
    await this.kernelExecutor.executeCode({ code: reloadCode }, true);
  }
}
