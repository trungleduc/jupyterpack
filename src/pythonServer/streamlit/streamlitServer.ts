import { JupyterPackFramework } from '../../type';
import { TornadoServer } from '../tornado/tornadoServer';

export class StreamlitServer extends TornadoServer {
  async init(options: {
    entryPath?: string;
    initCode?: string;
    instanceId: string;
    kernelClientId: string;
  }) {
    const { instanceId, kernelClientId, entryPath } = options;
    if (!entryPath) {
      throw new Error(
        'Missing streamlit entry path, please check your SPK file'
      );
    }
    const baseURL = this.buildBaseURL({
      instanceId,
      kernelClientId,
      framework: JupyterPackFramework.STREAMLIT
    });

    const patchCode = `
    from jupyterpack.common import set_base_url_env, patch_tornado, patch_all
    patch_all()
    patch_tornado()
    set_base_url_env("${baseURL}")
    `;
    await this.executeCode({ code: patchCode });

    const bootstrapCode = `
    from jupyterpack.streamlit import patch_streamlit
    patch_streamlit()
    `;
    await this.executeCode({ code: bootstrapCode });

    const stCode = `
      from jupyterpack.streamlit import StreamlitServer, create_streamlit_app
      __jupyterpack_streamlit_server, __jupyterpack_tornado_app = await create_streamlit_app("${entryPath}", "${baseURL}")
      ${this._SERVER_VAR} = StreamlitServer(__jupyterpack_tornado_app, "${baseURL}", __jupyterpack_streamlit_server)
      `;
    await this.executeCode({ code: stCode });
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
      __jupyterpack_streamlit_server, __jupyterpack_tornado_app = await create_streamlit_app("${entryPath}", "${this._baseUrl}")
      ${this._SERVER_VAR}.reload(__jupyterpack_tornado_app, __jupyterpack_streamlit_server)
      `;
    await this.executeCode(
      {
        code: reloadCode
      },
      true
    );
  }

  protected _SERVER_VAR = '__jupyterpack_streamlit_server';
}
