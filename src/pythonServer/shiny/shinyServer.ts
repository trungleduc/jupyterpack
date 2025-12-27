import { IPythonServerInitOptions, JupyterPackFramework } from '../../type';
import { BasePythonServer } from '../baseServer';
import { DEPENDENCIES } from './deps';

export class ShinyServer extends BasePythonServer {
  async init(options: IPythonServerInitOptions) {
    const mergedOptions: IPythonServerInitOptions = {
      ...options,
      dependencies: this.mergeDependencies(options.dependencies, DEPENDENCIES)
    };
    await super.init(mergedOptions);

    const { instanceId, kernelClientId, entryPath } = options;
    const baseURL = this.buildBaseURL({
      instanceId,
      kernelClientId,
      framework: JupyterPackFramework.SHINY
    });
    const bootstrapCode = `
    from jupyterpack.common import set_base_url_env
    set_base_url_env("${baseURL}")
    from jupyterpack.shiny import patch_shiny
    patch_shiny()
    `;
    await this.kernelExecutor.executeCode({ code: bootstrapCode });
    if (entryPath) {
      const loaderCode = `
      from jupyterpack.shiny import ShinyServer, get_shiny_app


      ${this._server_var} = ShinyServer(get_shiny_app("${entryPath}"), "${baseURL}")
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
    const { entryPath } = options;
    if (entryPath) {
      const reloadCode = `
      from jupyterpack.shiny import  get_shiny_app

      await ${this._server_var}.dispose()
      ${this._server_var}.reload(get_shiny_app("${entryPath}"))
      `;

      await this.kernelExecutor.executeCode({ code: reloadCode }, true);
    }
  }
}
