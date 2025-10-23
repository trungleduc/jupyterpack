import { arrayBufferToBase64 } from '../tools';
import {
  IBroadcastMessage,
  IConnectionManager,
  IDict,
  IKernelExecutor
} from '../type';
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
      const rawData = event.data;
      let data: IBroadcastMessage;
      if (typeof rawData === 'string') {
        data = JSON.parse(rawData);
      } else {
        data = rawData;
      }

      const { action, dest, wsUrl, payload } = data;
      const executor = this._kernelExecutors.get(dest);
      if (!executor) {
        console.error(
          'Missing kernel handle for message',
          data,
          dest,
          this._kernelExecutors
        );
        return;
      }

      switch (action) {
        case 'open': {
          executor.openWebsocket({
            instanceId: this.instanceId,
            kernelId: dest,
            wsUrl,
            protocol: payload.protocol
          });
          break;
        }
        case 'send': {
          let serializedData: string;
          let isBinary: boolean;
          if (payload instanceof ArrayBuffer || ArrayBuffer.isView(payload)) {
            // Convert data to base64 string
            serializedData = arrayBufferToBase64(payload as any);
            isBinary = true;
          } else if (typeof payload === 'string') {
            serializedData = payload;
            isBinary = false;
          } else {
            console.error('Unknown message type', payload);
            return;
          }
          executor.sendWebsocketMessage({
            instanceId: this.instanceId,
            kernelId: dest,
            wsUrl,
            message: JSON.stringify({ isBinary, data: serializedData })
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
