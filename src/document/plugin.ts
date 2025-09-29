import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { JupyterPackWidgetFactory } from './widgetFactory';
import { IConnectionManager } from '../type';
import { IConnectionManagerToken } from '../token';

const FACTORY = 'jupyterpack';
const CONTENT_TYPE = 'jupyterpack';

export const spkPlugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterpack:spkplugin',
  requires: [IConnectionManagerToken],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    connectionManager: IConnectionManager
  ): void => {
    const widgetFactory = new JupyterPackWidgetFactory({
      name: FACTORY,
      modelName: 'text',
      fileTypes: [CONTENT_TYPE],
      defaultFor: [CONTENT_TYPE],
      commands: app.commands,
      manager: app.serviceManager,
      connectionManager
    });

    // Registering the widget factory
    app.docRegistry.addWidgetFactory(widgetFactory);

    // register the filetype
    app.docRegistry.addFileType({
      name: CONTENT_TYPE,
      displayName: 'SPK',
      mimeTypes: ['text/json'],
      extensions: ['.spk', '.SPK'],
      fileFormat: 'json',
      contentType: CONTENT_TYPE
    });
  }
};
