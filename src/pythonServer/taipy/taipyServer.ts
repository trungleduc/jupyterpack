import { IPythonServerInitOptions, JupyterPackFramework } from '../../type';
import { BasePythonServer } from '../baseServer';
import { DEPENDENCIES } from './deps';

export class TaipyServer extends BasePythonServer {
  async init(options: IPythonServerInitOptions) {
    const mergedOptions: IPythonServerInitOptions = {
      ...options,
      dependencies: this.mergeDependencies(options.dependencies, DEPENDENCIES)
    };
    await super.init(mergedOptions);

    const { initCode, instanceId, kernelClientId } = options;

    const baseURL = this.buildBaseURL({
      instanceId,
      kernelClientId,
      framework: JupyterPackFramework.TAIPY
    });
    const patchCode = `
    from jupyterpack.common import set_base_url_env, patch_watchdog, patch_multiprocessing
    set_base_url_env("${baseURL}")
    patch_watchdog()
    patch_multiprocessing()
    `;
    await this.kernelExecutor.executeCode({ code: patchCode });

    if (initCode) {
      await this.kernelExecutor.executeCode({ code: initCode });
    }
    const loaderCode = `
      from jupyterpack.wsgi import WsgiServer
      ${this._server_var} = WsgiServer(app, "${baseURL}")
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
