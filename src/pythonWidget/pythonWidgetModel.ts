import { PathExt } from '@jupyterlab/coreutils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import {
  Contents,
  Kernel,
  ServiceManager,
  Session
} from '@jupyterlab/services';
import { PromiseDelegate } from '@lumino/coreutils';

import { PYTHON_SERVER } from '../pythonServer';
import { Signal } from '@lumino/signaling';
import {
  IBasePythonServer,
  IConnectionManager,
  IJupyterPackFileFormat,
  IPythonWidgetModel,
  JupyterPackFramework
} from '../type';
import { CommBroadcastManager } from './comm';
import { IS_LITE } from '../tools';

export class PythonWidgetModel implements IPythonWidgetModel {
  constructor(options: PythonWidgetModel.IOptions) {
    this._context = options.context;
    this._manager = options.manager;
    this._connectionManager = options.connectionManager;
    this._contentsManager = options.contentsManager;
    this._jpackModel = options.jpackModel;
    this._localPath = PathExt.dirname(this._context.localPath);
    this._autoreload = Boolean(this._jpackModel?.metadata?.autoreload);

    this._contentsManager.fileChanged.connect(this._onFileChanged, this);
  }

  get autoreload() {
    return this._autoreload;
  }

  set autoreload(val: boolean) {
    this._autoreload = val;
  }
  get isDisposed(): boolean {
    return this._isDisposed;
  }
  get connectionManager(): IConnectionManager {
    return this._connectionManager;
  }
  get serverReloaded() {
    return this._serverReloaded;
  }
  get kernelStatusChanged() {
    return this._kernelStatusChanged;
  }

  async reload() {
    if (!this._kernelStarted) {
      return;
    }
    const { spkContent, entryContent } = await this._loadData();
    await this._executor?.reloadPythonServer({
      entryPath: spkContent.entry,
      initCode: entryContent.content
    });
    this._serverReloaded.emit();
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

    const { filePath, spkContent, rootUrl, entryContent } =
      await this._loadData();
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

    this._sessionConnection = await sessionManager.startNew(
      {
        name: filePath,
        path: filePath,
        kernel: {
          name: kernelName
        },
        type: 'notebook'
      },
      {
        kernelConnectionOptions: { handleComms: true }
      }
    );
    const kernel = this._sessionConnection.kernel;
    if (kernel) {
      this._kernelStatusChanged.emit('started');
      this._commBroadcastManager.registerKernel(kernel);
      kernel.disposed.connect(() => {
        this._kernelStatusChanged.emit('stopped');
        this._commBroadcastManager.unregisterKernel(kernel.id);
      });
    }

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
      entryPath: spkContent.entry,
      dependencies: spkContent.dependencies,
      disableDependencies: spkContent.disableDependencies,
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
  async dispose(): Promise<void> {
    if (this._isDisposed) {
      return;
    }
    if (!IS_LITE) {
      this._sessionConnection?.kernel?.shutdown();
    }
    void this._executor?.disposePythonServer({
      kernel: this._sessionConnection?.kernel
    });
    this._contentsManager.fileChanged.disconnect(this._onFileChanged);
    this._commBroadcastManager.dispose();
    this._isDisposed = true;
  }

  private async _loadData() {
    const filePath = this._context.localPath;
    const spkContent = this._jpackModel;

    const entryPath = PathExt.join(PathExt.dirname(filePath), spkContent.entry);
    const rootUrl = spkContent.rootUrl ?? '/';
    const entryContent = await this._contentsManager.get(entryPath, {
      content: true,
      format: 'text'
    });
    return { filePath, spkContent, rootUrl, entryContent };
  }

  private async _onFileChanged(
    sender: Contents.IManager,
    args: Contents.IChangedArgs
  ) {
    if (this._autoreload && args.type === 'save') {
      if (
        args.newValue?.path &&
        args.newValue.path.startsWith(this._localPath)
      ) {
        await this.reload();
      }
    }
  }

  private _commBroadcastManager = new CommBroadcastManager();

  private _isDisposed = false;
  private _kernelStarted = false;
  private _sessionConnection: Session.ISessionConnection | undefined;
  private _manager: ServiceManager.IManager;
  private _context: DocumentRegistry.IContext<DocumentRegistry.IModel>;
  private _connectionManager: IConnectionManager;
  private _contentsManager: Contents.IManager;
  private _jpackModel: IJupyterPackFileFormat;
  private _executor?: IBasePythonServer;
  private _localPath: string;

  private _serverReloaded: Signal<IPythonWidgetModel, void> = new Signal<
    IPythonWidgetModel,
    void
  >(this);
  private _kernelStatusChanged: Signal<
    IPythonWidgetModel,
    'started' | 'stopped'
  > = new Signal(this);
  private _autoreload: boolean;
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
