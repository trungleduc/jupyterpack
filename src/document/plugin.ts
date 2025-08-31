import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { JupyterPackWidgetFactory } from './widgetFactory';

const FACTORY = 'jupyterpack';
const CONTENT_TYPE = 'jupyterpack';

export const spkPlugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterpack:spkplugin',
  requires: [],
  autoStart: true,
  activate: (app: JupyterFrontEnd): void => {
    const widgetFactory = new JupyterPackWidgetFactory({
      name: FACTORY,
      modelName: 'text',
      fileTypes: [CONTENT_TYPE],
      defaultFor: [CONTENT_TYPE],
      commands: app.commands,
      manager: app.serviceManager
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
