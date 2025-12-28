import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { WidgetTracker } from '@jupyterlab/apputils';
import { DocumentWidget } from '@jupyterlab/docregistry';
import { ILauncher } from '@jupyterlab/launcher';

import { IConnectionManagerToken, IJupyterpackDocTrackerToken } from '../token';
import { dashIcon, logoIcon, shinyIcon, streamlitIcon } from '../tools';
import { IConnectionManager, IJupyterpackDocTracker } from '../type';
import { addCommands } from './commands';
import { JupyterPackWidgetFactory } from './widgetFactory';

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

export const launcherPlugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterpack:spklauncher',
  requires: [ILauncher],
  autoStart: true,
  provides: IJupyterpackDocTrackerToken,
  activate: (app: JupyterFrontEnd, launcher: ILauncher): void => {
    const { commands } = app;
    const commandId = 'jupyterpack:create-new-file';
    const dashCommandId = 'jupyterpack:create-dash-app';
    const streamlitCommandId = 'jupyterpack:create-streamlit-app';
    const shinyCommandId = 'jupyterpack:create-shiny-app';
    commands.addCommand(commandId, {
      label: 'New SPK File',
      icon: logoIcon,
      caption: 'Create a new SPK fike',
      execute: async () => {
        console.log('AAAAAAAAAAAAAAA');
      }
    });
    commands.addCommand(dashCommandId, {
      label: 'Dash App',
      icon: dashIcon,
      caption: 'Create a new Dash Application',
      execute: async () => {
        console.log('AAAAAAAAAAAAAAA');
      }
    });
    commands.addCommand(streamlitCommandId, {
      label: 'Streamlit App',
      icon: streamlitIcon,
      caption: 'Create a new Streamlit Application',
      execute: async () => {
        console.log('AAAAAAAAAAAAAAA');
      }
    });
    commands.addCommand(shinyCommandId, {
      label: 'Shiny App',
      icon: shinyIcon,
      caption: 'Create a new Shiny Application',
      execute: async () => {
        console.log('AAAAAAAAAAAAAAA');
      }
    });
    launcher.add({
      command: commandId,
      category: 'JupyterPack',
      rank: 1
    });
    launcher.add({
      command: dashCommandId,
      category: 'JupyterPack',
      rank: 2
    });
    launcher.add({
      command: streamlitCommandId,
      category: 'JupyterPack',
      rank: 3
    });
    launcher.add({
      command: shinyCommandId,
      category: 'JupyterPack',
      rank: 4
    });
  }
};
