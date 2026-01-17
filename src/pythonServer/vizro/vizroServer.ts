import { IPythonServerInitOptions, JupyterPackFramework } from '../../type';
import { DashServer } from '../dash/dashServer';
import { DEPENDENCIES } from './deps';

export class VizroServer extends DashServer {
  framework = JupyterPackFramework.VIZRO;

  async init(options: IPythonServerInitOptions) {
    const mergedOptions: IPythonServerInitOptions = {
      ...options,
      dependencies: this.mergeDependencies(options.dependencies, DEPENDENCIES)
    };
    await super.init(mergedOptions);
  }

  async disposePythonServer(): Promise<void> {
    await this.kernelExecutor.executeCode({ code: this._resetVizroCode }, true);
    await super.disposePythonServer();
  }

  async reloadPythonServer(options: {
    entryPath?: string;
    initCode?: string;
  }): Promise<void> {
    await this.kernelExecutor.executeCode({ code: this._resetVizroCode }, true);
    await super.reloadPythonServer(options);
  }

  private _resetVizroCode = `
    from vizro import Vizro
    Vizro._reset()
    True
    `;
}
