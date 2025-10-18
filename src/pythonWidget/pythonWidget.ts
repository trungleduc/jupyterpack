import { PythonWidgetModel } from './pythonWidgetModel';
import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { IFramePanel } from '../document/iframePanel';

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
    });
  }

  get model(): PythonWidgetModel {
    return this._model;
  }

  dispose(): void {
    this._model.dispose();
  }

  private _model: PythonWidgetModel;
}

export namespace PythonWidget {
  export interface IOptions {
    id: string;
    model: PythonWidgetModel;
  }
}
