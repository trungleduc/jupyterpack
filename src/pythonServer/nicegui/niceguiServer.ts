import { IPythonServerInitOptions, JupyterPackFramework } from '../../type';
import { BasePythonServer } from '../baseServer';
import { DEPENDENCIES } from './deps';

export class NiceGUIServer extends BasePythonServer {
  framework = JupyterPackFramework.NICEGUI;
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
      from jupyterpack.nicegui import patch_nicegui
      patch_nicegui("${baseURL}", "${instanceId}", "${kernelClientId}")
      `
    });
    if (initCode) {
      await this.kernelExecutor.executeCode({ code: initCode });
    }
    const origin = window.location.origin;

    const loaderCode = `
      from jupyterpack.nicegui import get_nicegui_server
      from jupyterpack.starlette import StarletteServer 
      ${this._server_var} = StarletteServer(get_nicegui_server("${instanceId}", "${kernelClientId}"), "${baseURL}", "${origin}")
      `;
    await this.kernelExecutor.executeCode({ code: loaderCode });
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
