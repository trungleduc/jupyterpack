import { stringOrNone } from '../../tools';
import { IPythonServerInitOptions, JupyterPackFramework } from '../../type';
import { BasePythonServer } from '../baseServer';
import { DEPENDENCIES } from './deps';
import { Kernel } from '@jupyterlab/services';

export class NiceGUIServer extends BasePythonServer {
  framework = JupyterPackFramework.NICEGUI;
  async init(options: IPythonServerInitOptions) {
    const mergedOptions: IPythonServerInitOptions = {
      ...options,
      dependencies: this.mergeDependencies(options.dependencies, DEPENDENCIES)
    };
    await super.init(mergedOptions);
    const { initCode, instanceId, kernelClientId, entryPath } = options;

    const baseURL = this.buildBaseURL({
      instanceId,
      kernelClientId
    });

    await this.kernelExecutor.executeCode({
      code: `
      from jupyterpack.nicegui import patch_nicegui
      patch_nicegui("${baseURL}", "${instanceId}", "${kernelClientId}", ${stringOrNone(entryPath)})
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

  async disposePythonServer(options?: {
    kernel?: Kernel.IKernelConnection | null;
  }): Promise<void> {
    for (const element of this._openedWebsockets) {
      await this.closeWebsocket(element);
    }
    await options?.kernel?.shutdown();
  }

  async reloadPythonServer(options: {
    entryPath?: string;
    initCode?: string;
  }): Promise<void> {
    const { initCode, entryPath } = options;
    const resetCode = `
    import sys
    from nicegui import core
    if core.script_mode:
      print("RESETING NICEGUI")
      for name in list(sys.modules):
        if name == "nicegui" or name.startswith("nicegui."):
            del sys.modules[name]

      from jupyterpack.nicegui import patch_nicegui
      patch_nicegui("${this._baseUrl}", "${this._instanceId}", "${this._kernelClientId}", ${stringOrNone(entryPath)})
    True  
    `;

    await this.kernelExecutor.executeCode({ code: resetCode }, true);

    if (initCode) {
      if (initCode) {
        await this.kernelExecutor.executeCode({ code: initCode });
      }
      const reloadCode = `
      await ${this._server_var}.dispose()
      ${this._server_var}.reload(get_nicegui_server("${this._instanceId}", "${this._kernelClientId}"))
      `;
      await this.kernelExecutor.executeCode({ code: reloadCode }, true);
    }
  }
}
