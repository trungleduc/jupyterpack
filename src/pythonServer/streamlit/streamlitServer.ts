import { stringOrNone } from '../../tools';
import { IDict } from '../../type';
import { KernelExecutor } from '../kernelExecutor';
import { bootstrap } from './generatedPythonFiles';
export class StreamlitServer extends KernelExecutor {
  async init(options: {
    initCode?: string;
    instanceId: string;
    kernelClientId: string;
  }) {
    const { initCode, instanceId, kernelClientId } = options;

    const baseURL = this.buildBaseURL({ instanceId, kernelClientId });
    console.log('baseURL', baseURL);
    await this.executeCode({ code: bootstrap });
    if (initCode) {
      await this.executeCode({ code: initCode });
    }
    const serverCode = '';
    await this.executeCode({ code: serverCode });
  }

  getResponseFunctionFactory(options: {
    urlPath: string;
    method: string;
    headers: IDict;
    params?: string;
    content?: string;
  }) {
    const { method, urlPath, headers, params, content } = options;
    const code = `${this.STREAMLIT_GET_RESPONSE_FUNCTION}("${method}", "${urlPath}", headers=${JSON.stringify(headers)} , content=${stringOrNone(content)}, params=${stringOrNone(params)})`;
    return code;
  }

  private STREAMLIT_GET_RESPONSE_FUNCTION =
    '__jupyterpack_streamlit_get_response';
}
