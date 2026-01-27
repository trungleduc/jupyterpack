import { IPythonServerInitOptions, JupyterPackFramework } from '../../type';
import { BasePythonServer } from '../baseServer';
import { DEPENDENCIES } from './deps';

export class MesopServer extends BasePythonServer {
  framework = JupyterPackFramework.MESOP;

  async init(options: IPythonServerInitOptions) {
    const mergedOptions: IPythonServerInitOptions = {
      ...options,
      dependencies: this.mergeDependencies(options.dependencies, DEPENDENCIES)
    };
    await super.init(mergedOptions);

    const { entryPath, instanceId, kernelClientId } = options;
    if (!entryPath) {
      throw new Error(
        'Missing streamlit entry path, please check your SPK file'
      );
    }
    const baseURL = this.buildBaseURL({
      instanceId,
      kernelClientId
    });

    
    const serverCode = `
      from jupyterpack.mesop import MesopServer
      ${this._server_var} = MesopServer("${entryPath}", "${baseURL}")
      `;
    await this.kernelExecutor.executeCode({ code: serverCode });
  }

  async reloadPythonServer(options: {
    entryPath?: string;
    initCode?: string;
  }): Promise<void> {
    const { entryPath } = options;
    const reloadCode = `
      ${this._server_var}.reload("${entryPath}")
      `;
    await this.kernelExecutor.executeCode({ code: reloadCode }, true);
  }
}
