import { stringOrNone } from '../../tools';
import { IDict, JupyterPackFramework } from '../../type';
import { KernelExecutor } from '../kernelExecutor';
import {
  bootstrap,
  tornadoBridge,
  streamlitLoader
} from './generatedPythonFiles';
export class StreamlitServer extends KernelExecutor {
  async init(options: {
    initCode?: string;
    instanceId: string;
    kernelClientId: string;
  }) {
    const { initCode, instanceId, kernelClientId } = options;

    const baseURL = this.buildBaseURL({
      instanceId,
      kernelClientId,
      framework: JupyterPackFramework.STREAMLIT
    });
    await this.executeCode({ code: bootstrap });
    await this.executeCode({ code: tornadoBridge });
    if (initCode) {
      const stCode = streamlitLoader
        .replaceAll('{{base_url}}', baseURL)
        .replaceAll('{{script_content}}', initCode);
      await this.executeCode({ code: stCode });
    }
  }

  getResponseFunctionFactory(options: {
    urlPath: string;
    method: string;
    headers: IDict;
    params?: string;
    content?: string;
  }) {
    const { method, urlPath, headers, params, content } = options;
    const code = `await ${this.STREAMLIT_GET_RESPONSE_FUNCTION}("${method}", "${urlPath}", headers=${JSON.stringify(headers)} , content=${stringOrNone(content)}, params=${stringOrNone(params)})`;
    return code;
  }

  async disposePythonServer(): Promise<void> {
    await this.executeCode({
      code: '__jupyterpack_streamlit_dispose()'
    });
  }

  async openWebsocket(options: {
    instanceId: string;
    kernelId: string;
    wsUrl: string;
    protocol?: string;
  }): Promise<void> {
    const { instanceId, kernelId, wsUrl, protocol } = options;

    const code = `await __jupyterpack_streamlit_open_ws("${instanceId}", "${kernelId}", "${wsUrl}", ${stringOrNone(protocol)})`;
    await this.executeCode({ code });
  }

  private STREAMLIT_GET_RESPONSE_FUNCTION =
    '__jupyterpack_streamlit_get_response';
}
