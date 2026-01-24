import { IPythonServerInitOptions, JupyterPackFramework } from '../../type';
import { BasePythonServer } from '../baseServer';
import { DEPENDENCIES } from './deps';

export class GradioServer extends BasePythonServer {
  framework = JupyterPackFramework.GRADIO;

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
      from jupyterpack.gradio import patch_gradio
      patch_gradio("${baseURL}", "${instanceId}", "${kernelClientId}")
      `
    });
    if (initCode) {
      await this.kernelExecutor.executeCode({ code: initCode });
    }

    const loaderCode = `
      from jupyterpack.gradio import get_gradio_server
      from jupyterpack.starlette import StarletteServer 
      ${this._server_var} = StarletteServer(get_gradio_server("${instanceId}", "${kernelClientId}"), "${baseURL}")
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
    await ${this._server_var}.dispose()
    ${this._server_var}.reload(get_gradio_server("${this._instanceId}", "${this._kernelClientId}"))
    `;
    await this.kernelExecutor.executeCode({ code: reloadCode }, true);
  }
}
