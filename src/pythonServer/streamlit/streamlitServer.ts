import { IPythonServerInitOptions, JupyterPackFramework } from '../../type';
import { BasePythonServer } from '../baseServer';
import { DEPENDENCIES } from './deps';

export class StreamlitServer extends BasePythonServer {
  framework = JupyterPackFramework.STREAMLIT;
  async init(options: IPythonServerInitOptions) {
    const mergedOptions: IPythonServerInitOptions = {
      ...options,
      dependencies: this.mergeDependencies(options.dependencies, DEPENDENCIES)
    };
    await super.init(mergedOptions);

    const { instanceId, kernelClientId, entryPath } = options;
    if (!entryPath) {
      throw new Error(
        'Missing streamlit entry path, please check your SPK file'
      );
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

    const bootstrapCode = `
    from jupyterpack.streamlit import patch_streamlit
    patch_streamlit()
    `;
    await this.kernelExecutor.executeCode({ code: bootstrapCode });

    const stCode = `
      from jupyterpack.streamlit import StreamlitServer, create_streamlit_app
      __jupyterpack_st_server, __jupyterpack_tor_app = await create_streamlit_app("${entryPath}", "${baseURL}")
      ${this._server_var} = StreamlitServer(__jupyterpack_tor_app, "${baseURL}", __jupyterpack_st_server)
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
      __jupyterpack_st_server, __jupyterpack_tor_app = await create_streamlit_app("${entryPath}", "${this._baseUrl}")
      ${this._server_var}.reload(__jupyterpack_tor_app, __jupyterpack_st_server)
      `;
    await this.kernelExecutor.executeCode(
      {
        code: reloadCode
      },
      true
    );
  }
}
