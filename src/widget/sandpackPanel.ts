import {
  ClientOptions,
  loadSandpackClient,
  SandpackClient
} from '@codesandbox/sandpack-client';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { Contents } from '@jupyterlab/services';
import { Widget } from '@lumino/widgets';

import { SandpackDocModel } from '../document/model';
import { SandpackFilesModel } from './sandpackFilesModel';
import { IDict } from '../type';

export class SandpackPanel extends Widget {
  constructor(options: {
    context: DocumentRegistry.IContext<SandpackDocModel>;
    contentsManager: Contents.IManager;
  }) {
    super();
    this.addClass('jp-SandpackPanel');

    this._contentsManager = options.contentsManager;
    this._iframe = document.createElement('iframe');

    this.node.appendChild(this._iframe);

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
  private _iframe: HTMLIFrameElement;
  private _contentsManager: Contents.IManager;
}
