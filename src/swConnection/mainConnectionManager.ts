import { IConnectionManager, IDict, IKernelExecutor } from '../type';
import { UUID } from '@lumino/coreutils';

/**
 * Manages connections between clients and kernel executors.
 * This class handles the registration of kernel executors and the generation of responses
 * for client requests. It maintains a mapping of kernel client IDs to their respective executors.
 * The HTTP requests intercepted by the service worker are forwarded to the appropriate kernel executor.
 * The websocket messages forwarded from the broadcast channel are also forwarded to the appropriate kernel executor.
 * It's running on the main thread
 */
export class ConnectionManager implements IConnectionManager {
  constructor(public instanceId: string) {
    this._wsBroadcastChannel = new BroadcastChannel(
      `/jupyterpack/ws/${instanceId}`
    );
    this._initWsChannel();
  }

  async registerConnection(
    kernelExecutor: IKernelExecutor
  ): Promise<{ instanceId: string; kernelClientId: string }> {
    const uuid = UUID.uuid4();

    this._kernelExecutors.set(uuid, kernelExecutor);

    return { instanceId: this.instanceId, kernelClientId: uuid };
  }

  async generateResponse(options: {
    kernelClientId: string;
    urlPath: string;
    method: string;
    headers: IDict;
    requestBody?: ArrayBuffer;
    params?: string;
  }): Promise<IDict | null> {
    const { urlPath, kernelClientId, method, params, requestBody, headers } =
      options;
    const executor = this._kernelExecutors.get(kernelClientId);
    if (!executor) {
      return null;
    }

    const response = await executor.getResponse({
      urlPath,
      method,
      params,
      headers,
      requestBody
    });
    return response;
  }
  private _initWsChannel() {
    this._wsBroadcastChannel.onmessage = event => {
      const { action, dest, payload } = event.data;
      const executor = this._kernelExecutors.get(dest);
      if (!executor) {
        console.error('Missing kernel handle for message', event.data);
        return;
      }

      switch (action) {
        case 'open': {
          console.log('dest', dest, payload);
          this._wsBroadcastChannel.postMessage({
            action: 'connected',
            dest,
            payload: null
          });
          break;
        }

        default:
          break;
      }
    };
  }
  private _kernelExecutors = new Map<string, IKernelExecutor>();
  private _wsBroadcastChannel: BroadcastChannel;
}
