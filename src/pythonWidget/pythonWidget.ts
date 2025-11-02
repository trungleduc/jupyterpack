import { PythonWidgetModel } from './pythonWidgetModel';
import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { IFramePanel } from '../document/iframePanel';
import { PromiseDelegate } from '@lumino/coreutils';

export class PythonWidget extends IFramePanel {
  constructor(options: PythonWidget.IOptions) {
    super();
    this._model = options.model;
    this._model.initialize().then(connectionData => {
      if (!connectionData.success) {
        this.toggleSpinner(false);
        this._iframe.contentDocument!.body.innerText = `Failed to start server: ${connectionData.error}`;
        return;
      }
      this._isReady.resolve();
      const iframe = this._iframe;
      const fullLabextensionsUrl = PageConfig.getOption('fullLabextensionsUrl');

      const iframeUrl = URLExt.join(
        fullLabextensionsUrl,
        'jupyterpack/static',
        connectionData.instanceId,
        connectionData.framework,
        connectionData.kernelClientId,
        connectionData.rootUrl
      );

      iframe.src = iframeUrl;

      iframe.addEventListener('load', () => {
        this.toggleSpinner(false);
      });
      this._model.serverReloaded.connect(() => {
        console.log('reload iframe');
        this._iframe?.contentWindow?.location?.reload();
      });
    });
  }

  get autoreload() {
    return this._model.autoreload;
  }
  set autoreload(value: boolean) {
    this._model.autoreload = value;
  }
  get isReady(): Promise<void> {
    return this._isReady.promise;
  }
  get model(): PythonWidgetModel {
    return this._model;
  }

  async reload(): Promise<void> {
    await this._model.reload();
  }

  dispose(): void {
    this._model.dispose();
  }

  private _model: PythonWidgetModel;
  private _isReady = new PromiseDelegate<void>();
}

export namespace PythonWidget {
  export interface IOptions {
    id: string;
    model: PythonWidgetModel;
  }
}
