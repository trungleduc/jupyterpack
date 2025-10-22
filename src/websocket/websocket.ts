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

  const bcWsChannel = new BroadcastChannel(`/jupyterpack/ws/${instanceId}`);

  class BroadcastChannelWebSocket implements WebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      const urlObj = new URL(url);
      // TODO: handle protocols
      // this._protocols = protocols;
      this.url = urlObj.pathname + urlObj.search + urlObj.hash;
      console.log('BroadcastChannelWebSocket constructor', this.url, protocols);
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
      console.log('BroadcastChannelWebSocket default onclose called');
    };
    onerror: ((this: WebSocket, ev: Event) => any) | null = () => {
      console.log('BroadcastChannelWebSocket default onerror called');
    };
    onmessage:
      | ((this: WebSocket, ev: MessageEvent | { data: any }) => any)
      | null = () => {
      console.log('BroadcastChannelWebSocket default onmessage called');
    };
    onopen: ((this: WebSocket, ev: Event | { data: any }) => any) | null =
      () => {
        console.log('BroadcastChannelWebSocket default onopen called');
      };
    close(code?: unknown, reason?: unknown): void {
      if (this.readyState === this.CLOSED) {
        return;
      }
      console.log('BroadcastChannelWebSocket close called', code, reason);
      // sendTypedMessage({
      //   action: 'close',
      //   wsUrl: this.url
      // });
      if (this.onclose) {
        this.onclose();
      }
      while (this._eventHandlers['close'].length) {
        const cb = this._eventHandlers['close'].pop();
        console.log('calling', cb);
        cb();
      }
      // this._eventHandlers['close'].forEach(handler => handler());
      this._eventHandlers['close'] = [];
      bcWsChannel.removeEventListener('message', this._bcMessageHandler);

      this.readyState = this.CLOSED;
    }
    send(data: unknown): void {
      console.log('SENDING DATA', data);
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

    // private _protocols: string | string[] | undefined;
    private _eventHandlers: {
      message: any[];
      open: any[];
      close: any[];
      error: any[];
    } = { message: [], open: [], close: [], error: [] };

    private _bcMessageHandler = async (event: MessageEvent) => {
      console.log('BC RECEIVED', event.data);

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

        case 'message': {
          if (this.onmessage) {
            this.onmessage({ data: payload });
          }
          this._eventHandlers.message.forEach(handler =>
            handler({ data: payload })
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
  console.log('[iframe patch injected]');
})();
