import { PathExt } from '@jupyterlab/coreutils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import {
  Contents,
  Kernel,
  ServiceManager,
  Session
} from '@jupyterlab/services';
import { PromiseDelegate } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';

import { PYTHON_SERVER } from '../pythonServer';
import {
  IConnectionManager,
  IJupyterPackFileFormat,
  IKernelExecutor,
  JupyterPackFramework
} from '../type';

export class PythonWidgetModel implements IDisposable {
  constructor(options: PythonWidgetModel.IOptions) {
    this._context = options.context;
    this._manager = options.manager;
    this._connectionManager = options.connectionManager;
    this._contentsManager = options.contentsManager;
    this._jpackModel = options.jpackModel;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }
  get connectionManager(): IConnectionManager {
    return this._connectionManager;
  }
  async initialize(): Promise<
    | {
        success: true;
        instanceId: string;
        kernelClientId: string;
        rootUrl: string;
        framework: JupyterPackFramework;
      }
    | { success: false; error: string }
  > {
    if (this._kernelStarted) {
      return {
        success: false,
        error: 'Server is called twice'
      };
    }
    const filePath = this._context.localPath;
    const spkContent = this._jpackModel;

    const entryPath = PathExt.join(PathExt.dirname(filePath), spkContent.entry);
    const rootUrl = spkContent.rootUrl ?? '/';
    const entryContent = await this._contentsManager.get(entryPath, {
      content: true,
      format: 'text'
    });
    const sessionManager = this._manager.sessions;
    await sessionManager.ready;
    await this._manager.kernelspecs.ready;
    const specs = this._manager.kernelspecs.specs;
    if (!specs) {
      return {
        success: false,
        error: 'Missing kernel spec'
      };
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
    const framework = spkContent.framework;
    const ServerClass = PYTHON_SERVER.get(framework);
    if (!ServerClass) {
      return {
        success: false,
        error: `Framework "${framework}" is not supported. Please check your .spk file.`
      };
    }
    const executor = (this._executor = new ServerClass({
      sessionConnection: this._sessionConnection
    }));
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
    return { ...data, rootUrl, framework, success: true };
  }
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    void this._executor?.disposePythonServer();
    this._isDisposed = true;
  }

  private _isDisposed = false;
  private _kernelStarted = false;
  private _sessionConnection: Session.ISessionConnection | undefined;
  private _manager: ServiceManager.IManager;
  private _context: DocumentRegistry.IContext<DocumentRegistry.IModel>;
  private _connectionManager: IConnectionManager;
  private _contentsManager: Contents.IManager;
  private _jpackModel: IJupyterPackFileFormat;
  private _executor?: IKernelExecutor;
}

export namespace PythonWidgetModel {
  export interface IOptions {
    jpackModel: IJupyterPackFileFormat;
    context: DocumentRegistry.IContext<DocumentRegistry.IModel>;
    manager: ServiceManager.IManager;
    connectionManager: IConnectionManager;
    contentsManager: Contents.IManager;
  }
}
