import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { JupyterPackWidgetFactory } from './widgetFactory';
import { IConnectionManager, IJupyterpackDocTracker } from '../type';
import { IConnectionManagerToken, IJupyterpackDocTrackerToken } from '../token';
import { WidgetTracker } from '@jupyterlab/apputils';
import { DocumentWidget } from '@jupyterlab/docregistry';
import { logoIcon } from '../tools';
import { addCommands } from './commands';

const FACTORY = 'jupyterpack';
const CONTENT_TYPE = 'jupyterpack';

export const spkPlugin: JupyterFrontEndPlugin<IJupyterpackDocTracker> = {
  id: 'jupyterpack:spkplugin',
  requires: [IConnectionManagerToken],
  autoStart: true,
  provides: IJupyterpackDocTrackerToken,
  activate: (
    app: JupyterFrontEnd,
    connectionManager: IConnectionManager
  ): IJupyterpackDocTracker => {
    const tracker = new WidgetTracker<DocumentWidget>({
      namespace: FACTORY
    });
    addCommands(app.commands, tracker);
    const widgetFactory = new JupyterPackWidgetFactory({
      name: FACTORY,
      modelName: 'text',
      fileTypes: [CONTENT_TYPE],
      defaultFor: [CONTENT_TYPE],
      commands: app.commands,
      manager: app.serviceManager,
      connectionManager,
      tracker
    });

    // Registering the widget factory
    app.docRegistry.addWidgetFactory(widgetFactory);

    // register the filetype
    app.docRegistry.addFileType({
      name: CONTENT_TYPE,
      displayName: 'SPK',
      mimeTypes: ['application/json'],
      extensions: ['.spk', '.SPK'],
      fileFormat: 'json',
      contentType: CONTENT_TYPE,
      icon: logoIcon
    });

    widgetFactory.widgetCreated.connect((_, widget) => {
      widget.title.icon = logoIcon;
      widget.context.pathChanged.connect(() => {
        tracker.save(widget);
      });
      tracker.add(widget);
    });

    return tracker;
  }
};
