import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { KernelMessage, Session } from '@jupyterlab/services';

import { arrayBufferToBase64 } from '../tools';
import { IDict, IKernelExecutor } from '../type';

export class KernelExecutor implements IKernelExecutor {
  constructor(options: KernelExecutor.IOptions) {
    this._sessionConnection = options.sessionConnection;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }
  async init(options: {
    initCode?: string;
    instanceId: string;
    kernelClientId: string;
  }) {
    const { initCode, instanceId, kernelClientId } = options;
    const labBaseUrl = PageConfig.getOption('baseUrl');
    const baseURL = URLExt.join(
      labBaseUrl,
      'extensions/jupyterpack/static',
      instanceId,
      'dash',
      kernelClientId,
      '/'
    );

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
    __monstra_transport = httpx.WSGITransport(app=app.server)
    def __monstra_get_response(method, url, headers, content=None, params=None):
      decoded_content = None
      if content is not None:
        content = base64.b64decode(content)
        decoded_content = content.decode()
      with httpx.Client(transport=__monstra_transport, base_url="http://testserver") as client:
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
  async getResponse(options: {
    method: string;
    urlPath: string;
    headers: IDict;
    requestBody?: ArrayBuffer;
    params?: string;
  }): Promise<IDict> {
    const { method, urlPath, requestBody, params, headers } = options;
    const content = requestBody ? arrayBufferToBase64(requestBody) : undefined;
    const code = `__monstra_get_response("${method}", "${urlPath}", headers=${JSON.stringify(headers)} , content=${content ? `"${content}"` : 'None'}, params=${params ? `"${params}"` : 'None'})`;
    const raw = await this.executeCode({ code });
    const jsonStr = atob(raw.slice(1, -1));
    const obj = JSON.parse(jsonStr);

    return obj;
  }
  async executeCode(
    code: KernelMessage.IExecuteRequestMsg['content']
  ): Promise<string> {
    const kernel = this._sessionConnection?.kernel;
    if (!kernel) {
      throw new Error('Session has no kernel.');
    }
    return new Promise<string>((resolve, reject) => {
      const future = kernel.requestExecute(code, false, undefined);
      const parentMsgid = future.msg.header.msg_id;
      let executeResult = '';
      future.onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
        const msgType = msg.header.msg_type;
        switch (msgType) {
          case 'execute_result': {
            const content = (msg as KernelMessage.IExecuteResultMsg).content
              .data['text/plain'] as string;
            executeResult += content;
            break;
          }
          case 'status': {
            if (
              (msg as KernelMessage.IStatusMsg).content.execution_state ===
                'idle' &&
              msg.parent_header.msg_id === parentMsgid
            ) {
              resolve(executeResult);
            }
            break;
          }
          case 'stream': {
            const content = (msg as KernelMessage.IStreamMsg).content.text;
            executeResult += content;
            break;
          }
          case 'error': {
            console.error('Kernel operation failed', msg.content);
            reject(msg.content);
            break;
          }
          default:
            break;
        }
      };
    });
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._sessionConnection.dispose();
  }

  private _isDisposed: boolean = false;
  private _sessionConnection: Session.ISessionConnection;
}

export namespace KernelExecutor {
  export interface IOptions {
    sessionConnection: Session.ISessionConnection;
  }
}
