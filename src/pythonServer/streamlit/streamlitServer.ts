import { stringOrNone } from '../../tools';
import { IDict, JupyterPackFramework } from '../../type';
import { patch, tools } from '../common/generatedPythonFiles';
import { KernelExecutor } from '../kernelExecutor';
import {
  bootstrap as tornadoBootstrap,
  tornadoBridge
} from '../tornado/generatedPythonFiles';
import { bootstrap, streamlitLoader } from './generatedPythonFiles';

export class StreamlitServer extends KernelExecutor {
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
    await this.executeCode({ code: patch });
    await this.executeCode({ code: tools.replaceAll('{{base_url}}', baseURL) });
    await this.executeCode({ code: tornadoBootstrap });
    await this.executeCode({ code: tornadoBridge });
    await this.executeCode({ code: bootstrap });

    const stCode = streamlitLoader
      .replaceAll('{{base_url}}', baseURL)
      .replaceAll('{{script_path}}', entryPath);
    await this.executeCode({ code: stCode });
  }

  getResponseFunctionFactory(options: {
    urlPath: string;
    method: string;
    headers: IDict;
    params?: string;
    content?: string;
  }) {
    const { method, urlPath, headers, params, content } = options;
    const code = `await ${this._GET_RESPONSE_FUNCTION}("${method}", "${urlPath}", headers=${JSON.stringify(headers)} , content=${stringOrNone(content)}, params=${stringOrNone(params)})`;
    return code;
  }

  openWebsocketFunctionFactory(options: {
    instanceId: string;
    kernelId: string;
    wsUrl: string;
    protocol?: string;
  }): string {
    const { instanceId, kernelId, wsUrl, protocol } = options;

    const code = `await ${this._OPEN_WEBSOCKET_FUNCTION}("${instanceId}", "${kernelId}", "${wsUrl}", ${stringOrNone(protocol)})`;
    return code;
  }

  sendWebsocketMessageFunctionFactory(options: {
    instanceId: string;
    kernelId: string;
    wsUrl: string;
    message: string;
  }): string {
    const { instanceId, kernelId, wsUrl, message } = options;
    const code = `await ${this._SEND_WEBSOCKET_FUNCTION}("${instanceId}", "${kernelId}", "${wsUrl}", '''${message}''')`;
    return code;
  }

  async disposePythonServer(): Promise<void> {
    await this.executeCode({
      code: '__jupyterpack_streamlit_dispose()'
    });
  }

  private _GET_RESPONSE_FUNCTION = '__jupyterpack_streamlit_get_response';
  private _OPEN_WEBSOCKET_FUNCTION = '__jupyterpack_streamlit_open_ws';
  private _SEND_WEBSOCKET_FUNCTION =
    '__jupyterpack_streamlit_receive_ws_message';
}
