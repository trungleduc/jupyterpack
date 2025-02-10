import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { SandpackDocModelFactory } from './modelFactory';
import { SandpackWidgetFactory } from './widgetFactory';

const FACTORY = 'sandpack';
const CONTENT_TYPE = 'sandpack';

const activate = (app: JupyterFrontEnd): void => {
  const widgetFactory = new SandpackWidgetFactory({
    name: FACTORY,
    modelName: 'sandpack-model',
    fileTypes: [CONTENT_TYPE],
    defaultFor: [CONTENT_TYPE],
    commands: app.commands,
    manager: app.serviceManager
  });

  // Registering the widget factory
  app.docRegistry.addWidgetFactory(widgetFactory);

  // Creating and registering the model factory for our custom DocumentModel
  const modelFactory = new SandpackDocModelFactory();
  app.docRegistry.addModelFactory(modelFactory);
  // register the filetype
  app.docRegistry.addFileType({
    name: CONTENT_TYPE,
    displayName: 'SPK',
    mimeTypes: ['text/json'],
    extensions: ['.spk', '.SPK'],
    fileFormat: 'text',
    contentType: CONTENT_TYPE
  });
};

export const spkPlugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterpack:spkplugin',
  requires: [],
  autoStart: true,
  activate
};
