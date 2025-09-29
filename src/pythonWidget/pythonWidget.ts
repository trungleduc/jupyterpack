import { PythonWidgetModel } from './pythonWidgetModel';
import { PageConfig } from '@jupyterlab/coreutils';
import { IFramePanel } from '../document/iframePanel';

export class PythonWidget extends IFramePanel {
  constructor(options: PythonWidget.IOptions) {
    super();
    this._model = options.model;
    this._model.initialize().then(connectionData => {
      if (!connectionData) {
        return;
      }
      const iframe = this._iframe;
      const fullLabextensionsUrl = PageConfig.getOption('fullLabextensionsUrl');
      iframe.src = `${fullLabextensionsUrl}/jupyterpack/static/${connectionData.instanceId}/dash/${connectionData.kernelClientId}/`;
      iframe.addEventListener('load', () => {
        this.toggleSpinner(false);
      });
    });
  }

  get model(): PythonWidgetModel {
    return this._model;
  }

  private _model: PythonWidgetModel;
}

export namespace PythonWidget {
  export interface IOptions {
    id: string;
    model: PythonWidgetModel;
  }
}
