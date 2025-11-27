(() => {
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

  interface IBroadcastMessage {
    action:
      | 'message'
      | 'open'
      | 'close'
      | 'error'
      | 'send'
      | 'connected'
      | 'backend_message';
    dest: string;
    wsUrl: string;
    payload?: any;
  }

  const sendTypedMessage = (msg: Omit<IBroadcastMessage, 'dest'>) => {
    bcWsChannel.postMessage({ ...msg, dest: kernelClientId });
  };

  function base64ToBinary(base64: string, dataType: BinaryType) {
    const binary = atob(base64); // decode base64
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    if (dataType === 'arraybuffer') {
      return bytes.buffer;
    } else if (dataType === 'blob') {
      return new Blob([bytes], { type: 'application/octet-stream' });
    } else {
      throw new Error("Unsupported type: use 'arraybuffer' or 'blob'");
    }
  }

  const decodeServerMessage = (
    payload: {
      data: string;
      isBinary: boolean;
    },
    binaryType: BinaryType
  ) => {
    const { data, isBinary } = payload;
    if (isBinary) {
      // Decode base64 string to array buffer or blob

      return base64ToBinary(data, binaryType);
    }
    return data;
  };
  const bcWsChannel = new BroadcastChannel(
    `/jupyterpack/ws/${instanceId}/${kernelClientId}`
  );

  class BroadcastChannelWebSocket implements WebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      const urlObj = new URL(url);
      this.url = urlObj.pathname + urlObj.search + urlObj.hash;

      if (protocols) {
        this.protocol = Array.isArray(protocols)
          ? protocols.join(',')
          : protocols;
      } else {
        this.protocol = '';
      }
      this.binaryType = 'blob';
      this.bufferedAmount = 0;
      this.extensions = '';

      this.readyState = this.CONNECTING;
      this._open();
    }

    onclose: ((this: WebSocket, ev?: CloseEvent) => any) | null = () => {
      // no-op
    };
    onerror: ((this: WebSocket, ev: Event) => any) | null = () => {
      // no-op
    };
    onmessage:
      | ((this: WebSocket, ev: MessageEvent | { data: any }) => any)
      | null = () => {
      // no-op
    };
    onopen: ((this: WebSocket, ev: Event | { data: any }) => any) | null =
      () => {
        // no-op
      };
    close(code?: unknown, reason?: unknown): void {
      if (this.readyState === this.CLOSED) {
        return;
      }

      if (this.onclose) {
        this.onclose();
      }
      while (this._eventHandlers['close'].length) {
        const cb = this._eventHandlers['close'].pop();
        cb();
      }
      this._eventHandlers['close'] = [];
      sendTypedMessage({
        action: 'close',
        wsUrl: this.url
      });
      bcWsChannel.removeEventListener('message', this._bcMessageHandler);

      this.readyState = this.CLOSED;
    }
    send(data: unknown): void {
      sendTypedMessage({
        action: 'send',
        payload: data,
        wsUrl: this.url
      });
    }

    addEventListener(
      type: 'message' | 'open' | 'close' | 'error',
      listener: unknown,
      options?: unknown
    ): void {
      this._eventHandlers[type].push(listener);
    }
    removeEventListener(
      type: 'message' | 'open' | 'close' | 'error',
      listener: unknown,
      options?: unknown
    ): void {
      this._eventHandlers[type] = this._eventHandlers[type].filter(
        handler => handler !== listener
      );
    }

    dispatchEvent(event: unknown): boolean {
      return true;
    }
    readyState: number;
    url: string;
    protocol: string;
    binaryType: BinaryType;
    bufferedAmount: number;
    extensions: string;

    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSING = 2;
    readonly CLOSED = 3;

    private _eventHandlers: {
      message: any[];
      open: any[];
      close: any[];
      error: any[];
    } = { message: [], open: [], close: [], error: [] };

    private _bcMessageHandler = async (event: MessageEvent) => {
      const rawData = event.data;
      let data: IBroadcastMessage;
      if (typeof rawData === 'string') {
        data = JSON.parse(rawData);
      } else {
        data = rawData;
      }

      const { action, dest, wsUrl, payload } = data;
      if (dest !== kernelClientId || wsUrl !== this.url) {
        return;
      }

      switch (action) {
        case 'connected': {
          this.readyState = this.OPEN;

          if (this.onopen) {
            this.onopen(event);
          }
          this._eventHandlers.open.forEach(handler =>
            handler({ data: payload })
          );
          break;
        }

        case 'backend_message': {
          const decoded = decodeServerMessage(payload, this.binaryType);
          if (this.onmessage) {
            this.onmessage({ data: decoded });
          }
          this._eventHandlers.message.forEach(handler =>
            handler({ data: decoded })
          );
          break;
        }
        default:
          break;
      }
    };
    private _open = () => {
      sendTypedMessage({
        action: 'open',
        payload: {
          protocol: this.protocol
        },
        wsUrl: this.url
      });

      bcWsChannel.addEventListener('message', this._bcMessageHandler);
    };
  }

  window.WebSocket = BroadcastChannelWebSocket as any;
})();
