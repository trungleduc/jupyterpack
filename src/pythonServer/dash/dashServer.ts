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
    await super.init(options);
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
    const code = `__jupyterpack_dash_get_response("${method}", "${urlPath}", headers=${JSON.stringify(headers)} , content=${stringOrNone(content)}, params=${stringOrNone(params)})`;
    return code;
  }

  async disposePythonServer(): Promise<void> {
    await this.executeCode({ code: '__jupyterpack_dash_dispose()' });
  }

  async reloadPythonServer(options: {
    entryPath?: string;
    initCode?: string;
  }): Promise<void> {
    const { initCode } = options;
    if (initCode) {
      await this.executeCode({ code: initCode });
    }
    await this.executeCode({ code: '__jupyterpack_reload_dash_app()' }, true);
  }
}
