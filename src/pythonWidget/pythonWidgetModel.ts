import { DocumentRegistry } from '@jupyterlab/docregistry';
import { IDisposable } from '@lumino/disposable';
import {
  ServiceManager,
  Session,
  Kernel,
  Contents
} from '@jupyterlab/services';
import { PromiseDelegate } from '@lumino/coreutils';
import { IConnectionManager, IJupyterPackFileFormat } from '../type';
import { KernelExecutor } from './kernelExecutor';
import { PathExt } from '@jupyterlab/coreutils';

export class PythonWidgetModel implements IDisposable {
  constructor(options: PythonWidgetModel.IOptions) {
    this._context = options.context;
    this._manager = options.manager;
    this._connectionManager = options.connectionManager;
    this._contentsManager = options.contentsManager;
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
    const spkContent =
      this._context.model.toJSON() as any as IJupyterPackFileFormat;

    const entryPath = PathExt.join(PathExt.dirname(filePath), spkContent.entry);

    const entryContent = await this._contentsManager.get(entryPath, {
      content: true,
      format: 'text'
    });
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
      initCode: entryContent.content,
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
  private _contentsManager: Contents.IManager;
}

export namespace PythonWidgetModel {
  export interface IOptions {
    context: DocumentRegistry.IContext<DocumentRegistry.IModel>;
    manager: ServiceManager.IManager;
    connectionManager: IConnectionManager;
    contentsManager: Contents.IManager;
  }
}
