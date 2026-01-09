import { IPythonServerInitOptions, JupyterPackFramework } from '../../type';
import { BasePythonServer } from '../baseServer';
import { DEPENDENCIES } from './deps';

export class PanelServer extends BasePythonServer {
  framework = JupyterPackFramework.PANEL;
  async init(options: IPythonServerInitOptions) {
    const mergedOptions: IPythonServerInitOptions = {
      ...options,
      dependencies: this.mergeDependencies(options.dependencies, DEPENDENCIES)
    };
    await super.init(mergedOptions);

    const { instanceId, kernelClientId, entryPath } = options;
    if (!entryPath) {
      throw new Error('Missing Panel entry path, please check your SPK file');
    }
    const baseURL = this.buildBaseURL({
      instanceId,
      kernelClientId
    });

    const patchCode = `
      from jupyterpack.common import set_base_url_env, patch_tornado
      patch_tornado()
      set_base_url_env("${baseURL}")
    `;
    await this.kernelExecutor.executeCode({ code: patchCode });

    const stCode = `
      from jupyterpack.panel import PanelServer, patch_panel
      patch_panel()
      ${this._server_var} = PanelServer("${entryPath}", "${baseURL}")
      `;
    await this.kernelExecutor.executeCode({ code: stCode });
  }

  async reloadPythonServer(options: {
    entryPath?: string;
    initCode?: string;
  }): Promise<void> {
    const { entryPath } = options;
    if (!entryPath || !this._baseUrl) {
      return;
    }
    const reloadCode = `
      ${this._server_var}.dispose()
      ${this._server_var}.reload("${entryPath}")
      `;
    await this.kernelExecutor.executeCode(
      {
        code: reloadCode
      },
      true
    );
  }
}
