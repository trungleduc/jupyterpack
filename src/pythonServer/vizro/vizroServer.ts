import { IPythonServerInitOptions, JupyterPackFramework } from '../../type';
import { BasePythonServer } from '../baseServer';
import { DEPENDENCIES } from './deps';

export class VizroServer extends BasePythonServer {
  framework = JupyterPackFramework.VIZRO;

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
      from jupyterpack.dash import DashServer, get_dash_server
      try:
        ${this._server_var} = DashServer(app, "${baseURL}")
      except NameError:
        if get_dash_server("${instanceId}", "${kernelClientId}") is not None:
          ${this._server_var} = DashServer(get_dash_server("${instanceId}", "${kernelClientId}"), "${baseURL}")
        else:
          raise Exception("No flask app found")
      
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
    try:
      ${this._server_var}.reload(app)
    except NameError:
      if get_dash_server("${this._instanceId}", "${this._kernelClientId}") is not None:
        ${this._server_var}.reload(get_dash_server("${this._instanceId}", "${this._kernelClientId}"))
      else:
        raise Exception("No flask app found")
    `;
    await this.kernelExecutor.executeCode({ code: reloadCode }, true);
  }
}
