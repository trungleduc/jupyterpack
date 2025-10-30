import { stringOrNone } from '../../tools';
import { IDict, JupyterPackFramework } from '../../type';
import { tools } from '../common/generatedPythonFiles';
import { KernelExecutor } from '../kernelExecutor';
import {
  bootstrap,
  tornadoBridge,
  tornadoLoader
} from './generatedPythonFiles';
export class TornadoServer extends KernelExecutor {
  async init(options: {
    initCode?: string;
    instanceId: string;
    kernelClientId: string;
  }) {
    await super.init(options);
    const { initCode, instanceId, kernelClientId } = options;

    const baseURL = this.buildBaseURL({
      instanceId,
      kernelClientId,
      framework: JupyterPackFramework.TORNADO
    });
    await this.executeCode({ code: tools.replaceAll('{{base_url}}', baseURL) });
    await this.executeCode({ code: bootstrap });
    await this.executeCode({ code: tornadoBridge });
    if (initCode) {
      const initCodeWithUrl = initCode.replaceAll('{{base_url}}', baseURL);
      await this.executeCode({ code: initCodeWithUrl });
      const torCode = tornadoLoader.replaceAll('{{base_url}}', baseURL);
      await this.executeCode({ code: torCode });
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
      code: '__jupyterpack_tornado_dispose()'
    });
  }

  private _GET_RESPONSE_FUNCTION = '__jupyterpack_tornado_get_response';
  private _OPEN_WEBSOCKET_FUNCTION = '__jupyterpack_tornado_open_ws';

  private _SEND_WEBSOCKET_FUNCTION = '__jupyterpack_tornado_receive_ws_message';
}
