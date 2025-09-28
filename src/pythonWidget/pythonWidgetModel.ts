import { DocumentRegistry } from '@jupyterlab/docregistry';
import { IDisposable } from '@lumino/disposable';
import { ServiceManager, Session, Kernel } from '@jupyterlab/services';
import { PromiseDelegate } from '@lumino/coreutils';
import { IConnectionManager } from '../type';
import { KernelExecutor } from './kernelExecutor';

export class PythonWidgetModel implements IDisposable {
  constructor(options: MonstraDocModel.IOptions) {
    this._context = options.context;
    this._manager = options.manager;
    this._connectionManager = options.connectionManager;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }
  get connectionManager(): IConnectionManager {
    return this._connectionManager;
  }
  async initialize(): Promise<{
    instanceId: string;
    kernelClientId: string;
  } | null> {
    if (this._kernelStarted) {
      return null;
    }
    const filePath = this._context.localPath;
    const sessionManager = this._manager.sessions;
    await sessionManager.ready;
    await this._manager.kernelspecs.ready;
    const specs = this._manager.kernelspecs.specs;
    if (!specs) {
      return null;
    }
    const { kernelspecs } = specs;
    let kernelName = Object.keys(kernelspecs)[0];
    if (kernelspecs[specs.default]) {
      kernelName = specs.default;
    }

    this._sessionConnection = await sessionManager.startNew({
      name: filePath,
      path: filePath,
      kernel: {
        name: kernelName
      },
      type: 'notebook'
    });
    const executor = new KernelExecutor({
      sessionConnection: this._sessionConnection
    });
    const data = await this._connectionManager.registerConnection(executor);
    await executor.init({
      initCode: this._context.model.toString(),
      ...data
    });
    const finish = new PromiseDelegate<void>();
    const cb = (_: Kernel.IKernelConnection, status: Kernel.Status) => {
      if (status === 'idle') {
        this._sessionConnection!.kernel?.statusChanged.disconnect(cb);
        finish.resolve();
      }
    };
    this._sessionConnection.kernel?.statusChanged.connect(cb);

    await finish.promise;
    this._kernelStarted = true;
    return data;
  }
  dispose(): void {
    this._isDisposed = true;
  }

  private _isDisposed = false;
  private _kernelStarted = false;
  private _sessionConnection: Session.ISessionConnection | undefined;
  private _manager: ServiceManager.IManager;
  private _context: DocumentRegistry.IContext<DocumentRegistry.IModel>;
  private _connectionManager: IConnectionManager;
}

export namespace MonstraDocModel {
  export interface IOptions {
    context: DocumentRegistry.IContext<DocumentRegistry.IModel>;
    manager: ServiceManager.IManager;
    connectionManager: IConnectionManager;
  }
}
