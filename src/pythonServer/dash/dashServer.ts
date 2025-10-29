import { stringOrNone } from '../../tools';
import { IDict, JupyterPackFramework } from '../../type';
import { patch } from '../common/generatedPythonFiles';
import { KernelExecutor } from '../kernelExecutor';
import { bootstrap, dashLoader } from './generatedPythonFiles';

export class DashServer extends KernelExecutor {
  async init(options: {
    initCode?: string;
    instanceId: string;
    kernelClientId: string;
  }) {
    const { initCode, instanceId, kernelClientId } = options;

    const baseURL = this.buildBaseURL({
      instanceId,
      kernelClientId,
      framework: JupyterPackFramework.DASH
    });
    await this.executeCode({ code: patch });
    await this.executeCode({
      code: bootstrap.replaceAll('{{base_url}}', baseURL)
    });
    if (initCode) {
      await this.executeCode({ code: initCode });
    }
    await this.executeCode({ code: dashLoader });
  }

  getResponseFunctionFactory(options: {
    urlPath: string;
    method: string;
    headers: IDict;
    params?: string;
    content?: string;
  }) {
    const { method, urlPath, headers, params, content } = options;
    const code = `${this.DASH_GET_RESPONSE_FUNCTION}("${method}", "${urlPath}", headers=${JSON.stringify(headers)} , content=${stringOrNone(content)}, params=${stringOrNone(params)})`;
    return code;
  }

  async disposePythonServer(): Promise<void> {
    //no-op
  }

  async openWebsocket(options: {
    instanceId: string;
    kernelId: string;
    wsUrl: string;
    protocol?: string;
  }): Promise<void> {
    //no-op
  }

  private DASH_GET_RESPONSE_FUNCTION = '__jupyterpack_dash_get_response';
}
