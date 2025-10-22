import { stringOrNone } from '../tools';
import { IDict, JupyterPackFramework } from '../type';
import { KernelExecutor } from './kernelExecutor';

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

    const osCode = `
      import os
      os.environ['DASH_URL_BASE_PATHNAME'] = '${baseURL}'
      `;
    await this.executeCode({ code: osCode });
    if (initCode) {
      await this.executeCode({ code: initCode });
    }
    const serverCode = `
      import httpx, json, base64
      __jupyterpack_dash_transport = httpx.WSGITransport(app=app.server)
      def ${this.DASH_GET_RESPONSE_FUNCTION}(method, url, headers, content=None, params=None):
        decoded_content = None
        if content is not None:
          content = base64.b64decode(content)
          decoded_content = content.decode()
        with httpx.Client(transport=__jupyterpack_dash_transport, base_url="http://testserver") as client:
          r = client.request(method, url, headers=headers, content=content, params=params)
          response = {
            "headers": dict(r.headers),
            "content": r.text,
            "status_code": r.status_code,
            "original_request": {"method": method, "url": url, "content": decoded_content, "params": params, "headers": headers},
          }
          json_str = json.dumps(response)
          b64_str = base64.b64encode(json_str.encode("utf-8")).decode("utf-8")
          return b64_str
      `;
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
