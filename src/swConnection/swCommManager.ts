import { IConnectionManager, IDict } from '../type';
import { wrap, transfer } from 'comlink';
export class CommManager {
  constructor() {}
  registerComm(instanceId: string, port: MessagePort): void {
    const comm = wrap<Omit<IConnectionManager, 'registerConnection'>>(port);

    this._commIds.set(instanceId, comm);
  }
  async generateResponse(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const urlPath = url.pathname;
    const method = request.method;
    const requestHeaders: IDict = {};

    for (const pair of request.headers.entries()) {
      if (!pair[0].startsWith('sec-ch-ua')) {
        requestHeaders[pair[0]] = pair[1];
      }
    }
    const params = url.searchParams.toString();
    const pathAfterExtensionName: string | undefined = urlPath.split(
      '/jupyterpack/static'
    )[1];
    const pathList = pathAfterExtensionName?.split('/').filter(Boolean);
    const instanceId = pathList?.[0];
    const kernelClientId = pathList?.[2];
    if (!instanceId || !kernelClientId) {
      return await fetch(url, { method });
    }
    const comm = this._commIds.get(instanceId);
    if (!comm) {
      throw new Error('Missing comm');
    }
    const requestBody = request.body ? await request.arrayBuffer() : undefined;
    const data = await comm.generateResponse({
      kernelClientId,
      urlPath,
      method,
      headers: requestHeaders,
      requestBody: requestBody
        ? transfer(requestBody, [requestBody])
        : undefined,
      params
    });
    if (data) {
      const { headers, content, status_code } = data;
      return new Response(content, { status: status_code, headers });
    }
    return await fetch(url, { method });
  }

  private _commIds: Map<
    string,
    Omit<IConnectionManager, 'registerConnection'>
  > = new Map();
}
