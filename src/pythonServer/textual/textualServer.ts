import { IPythonServerInitOptions, JupyterPackFramework } from '../../type';
import { BasePythonServer } from '../baseServer';
import { DEPENDENCIES } from './deps';

export class TextualServer extends BasePythonServer {
  async init(options: IPythonServerInitOptions) {
    const mergedOptions: IPythonServerInitOptions = {
      ...options,
      dependencies: this.mergeDependencies(options.dependencies, DEPENDENCIES)
    };
    await super.init(mergedOptions);

    const { instanceId, kernelClientId, initCode } = options;
    const baseURL = this.buildBaseURL({
      instanceId,
      kernelClientId,
      framework: JupyterPackFramework.TEXTUAL
    });
    const bootstrapCode = `
    from jupyterpack.common import set_base_url_env
    from jupyterpack.textual import patch_textual
    patch_textual()
    set_base_url_env("${baseURL}")
    `;
    await this.kernelExecutor.executeCode({ code: bootstrapCode });
    if (initCode) {
      await this.kernelExecutor.executeCode({ code: initCode });
    }

    const loaderCode = `
      from jupyterpack.textual import TextualServer
      ${this._server_var} = TextualServer(app, "${baseURL}")
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
    await this.disposePythonServer();

    if (initCode) {
      await this.kernelExecutor.executeCode({ code: initCode });
      await this.kernelExecutor.executeCode(
        { code: `${this._server_var}.reload(app)` },
        true
      );
    }
  }
}
