import {
  ClientOptions,
  loadSandpackClient,
  SandpackClient
} from '@codesandbox/sandpack-client';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { Contents } from '@jupyterlab/services';

import { IFramePanel } from '../document/iframePanel';
import { IDict } from '../type';
import { SandpackFilesModel } from './sandpackFilesModel';

export class SandpackPanel extends IFramePanel {
  constructor(options: {
    context: DocumentRegistry.IContext<DocumentRegistry.IModel>;
    contentsManager: Contents.IManager;
  }) {
    super();
    this._contentsManager = options.contentsManager;
    options.context.ready.then(async () => {
      await this.init(options.context.localPath);
    });
  }

  async init(localPath: string) {
    const currentDir = localPath.split('/').slice(0, -1).join('/');
    const filesModel = new SandpackFilesModel({
      contentsManager: this._contentsManager,
      path: currentDir
    });
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

  private _onFileChanged(
    sender: SandpackFilesModel,
    { allFiles }: { allFiles: IDict<{ code: string }> }
  ) {
    if (this._spClient) {
      this._spClient.updateSandbox({
        files: allFiles
      });
    }
  }

  private _spClient?: SandpackClient;
  private _contentsManager: Contents.IManager;
}
