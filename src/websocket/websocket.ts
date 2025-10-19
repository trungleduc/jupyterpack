const urlPath = new URL(window.location.href).pathname;
const pathAfterExtensionName: string | undefined = urlPath.split(
  '/jupyterpack/static'
)[1];
const pathList = pathAfterExtensionName?.split('/').filter(Boolean);
const instanceId = pathList?.[0];
const kernelClientId = pathList?.[2];
if (!instanceId || !kernelClientId) {
  throw new Error('Missing instance Id or kernelClient Id');
}

const bcWsChannel = new BroadcastChannel(`/jupyterpack/ws/${instanceId}`);

class BroadcastChannelWebSocket implements WebSocket {
  constructor(url: string | URL, protocols?: string | string[]) {
    console.log('BroadcastChannelWebSocket constructor', url, protocols);
    this.url = url.toString();
    if (protocols) {
      if (Array.isArray(protocols)) {
        this.protocol = protocols[0];
      } else {
        this.protocol = protocols;
      }
    } else {
      this.protocol = '';
    }
    this.binaryType = 'blob';
    this.bufferedAmount = 0;
    this.extensions = '';
    this.onclose = null;
    this.readyState = this.CONNECTING;
  }

  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
  onerror: ((this: WebSocket, ev: Event) => any) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
  onopen: ((this: WebSocket, ev: Event) => any) | null = null;
  close(code?: unknown, reason?: unknown): void {}
  send(data: unknown): void {}

  addEventListener(type: unknown, listener: unknown, options?: unknown): void {}
  removeEventListener(
    type: unknown,
    listener: unknown,
    options?: unknown
  ): void {}
  dispatchEvent(event: unknown): boolean {
    return true;
  }
  readyState: number;
  url: string;
  protocol: string;
  binaryType: BinaryType;
  bufferedAmount: number;
  extensions: string;

  readonly CONNECTING: 0 = 0;
  readonly OPEN: 1 = 1;
  readonly CLOSING: 2 = 2;
  readonly CLOSED: 3 = 3;
}

window.WebSocket = BroadcastChannelWebSocket as any;
console.log('[iframe patch injected]');
