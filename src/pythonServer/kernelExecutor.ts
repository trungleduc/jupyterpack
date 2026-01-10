import { KernelMessage, Session } from '@jupyterlab/services';
import stripAnsi from 'strip-ansi';

import { IKernelExecutor } from '../type';

export class KernelExecutor implements IKernelExecutor {
  constructor(options: KernelExecutor.IOptions) {
    this._sessionConnection = options.sessionConnection;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  async executeCode(
    code: KernelMessage.IExecuteRequestMsg['content'],
    waitForResult?: boolean
  ): Promise<string | null> {
    const kernel = this._sessionConnection?.kernel;
    if (!kernel) {
      throw new Error('Session has no kernel.');
    }
    return new Promise<string | null>((resolve, reject) => {
      const future = kernel.requestExecute(code, false, undefined);
      let executeResult = '';
      future.onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
        const msgType = msg.header.msg_type;

        switch (msgType) {
          case 'execute_result': {
            if (waitForResult) {
              const content = (msg as KernelMessage.IExecuteResultMsg).content
                .data['text/plain'] as string;
              executeResult += content;
              resolve(executeResult);
            }
            break;
          }
          case 'stream': {
            const content = (msg as KernelMessage.IStreamMsg).content;
            if (content.text.trim().length === 0) {
              break;
            }
            if (content.name === 'stderr') {
              console.error('[Kernel stream]:', content.text);
            } else {
              console.log('[Kernel stream]:', content.text);
            }
            break;
          }
          case 'error': {
            console.error(
              'Kernel operation failed',
              code.code,
              (msg.content as any).traceback
                .map((it: string) => stripAnsi(it))
                .join('\n')
            );

            reject(msg.content);
            break;
          }
          default:
            break;
        }
      };
      if (!waitForResult) {
        resolve(null);
        // future.dispose() # TODO
      }
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
