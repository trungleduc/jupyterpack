import {
  ClientOptions,
  loadSandpackClient,
  SandpackClient
} from '@codesandbox/sandpack-client';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { Contents } from '@jupyterlab/services';

import { IFramePanel } from '../document/iframePanel';
import { IDict, IJupyterPackFileFormat } from '../type';
import { SandpackFilesModel } from './sandpackFilesModel';

export class SandpackPanel extends IFramePanel {
  constructor(options: {
    context: DocumentRegistry.IContext<DocumentRegistry.IModel>;
    contentsManager: Contents.IManager;
  }) {
    super();
    this._contentsManager = options.contentsManager;
    const { context } = options;
    options.context.ready.then(async () => {
      const jpackModel =
        context.model.toJSON() as any as IJupyterPackFileFormat;
      await this.init(context.localPath, jpackModel);
    });
  }

  async init(localPath: string, jpackModel: IJupyterPackFileFormat) {
    if (jpackModel?.metadata?.autoreload === true) {
      this._autoreload = true;
    }

    const currentDir = localPath.split('/').slice(0, -1).join('/');
    const filesModel = new SandpackFilesModel({
      contentsManager: this._contentsManager,
      path: currentDir
    });
    this._fileModel = filesModel;
    const allFiles = await filesModel.getAllFiles();

    const options: ClientOptions = {
      showLoadingScreen: true,
      showOpenInCodeSandbox: false
    };

    this._spClient = await loadSandpackClient(
      this._iframe,
      {
        files: allFiles
      },
      options
    );
    await this.connectSignals(filesModel, this._spClient);
  }

  async connectSignals(
    filesModel: SandpackFilesModel,
    sandpackClient: SandpackClient
  ) {
    filesModel.fileChanged.connect(this._onFileChanged, this);
    sandpackClient.listen(msg => {
      switch (msg.type) {
        case 'start': {
          this.toggleSpinner(true);
          break;
        }
        case 'success': {
          this.toggleSpinner(false);
          break;
        }
        default:
          break;
      }
    });
  }

  async reload(): Promise<void> {
    if (this._spClient && this._fileModel) {
      const allFiles = await this._fileModel.getAllFiles();
      this._spClient.updateSandbox({
        files: allFiles
      });
    }
  }

  private _onFileChanged(
    sender: SandpackFilesModel,
    { allFiles }: { allFiles: IDict<{ code: string }> }
  ) {
    if (this._autoreload && this._spClient) {
      this._spClient.updateSandbox({
        files: allFiles
      });
    }
  }

  private _spClient?: SandpackClient;
  private _contentsManager: Contents.IManager;
  private _fileModel: SandpackFilesModel | undefined;
  private _autoreload = false;
}
