import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { WidgetTracker } from '@jupyterlab/apputils';
import { DocumentWidget } from '@jupyterlab/docregistry';
import { ILauncher } from '@jupyterlab/launcher';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { IConnectionManagerToken, IJupyterpackDocTrackerToken } from '../token';
import {
  dashIcon,
  decodeSpk,
  fasthtmlIcon,
  logoIcon,
  panelIcon,
  shinyIcon,
  streamlitIcon,
  textualIcon,
  vizroIcon
} from '../tools';
import {
  IConnectionManager,
  IJupyterpackDocTracker,
  JupyterPackFramework
} from '../type';
import { addCommands, addLauncherCommands } from './commands';
import { JupyterPackWidgetFactory } from './widgetFactory';
import { spkFactory } from './templates/spk';
import { newFile } from './templates';

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
    addCommands(app.commands, tracker, app.serviceManager.contents);
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

const CREATE_SPK_COMMAND_ID = 'jupyterpack:create-new-file';
export const launcherPlugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterpack:spklauncher',
  optional: [ILauncher],
  autoStart: true,
  provides: IJupyterpackDocTrackerToken,
  activate: (app: JupyterFrontEnd, launcher: ILauncher | null): void => {
    if (!launcher) {
      return;
    }
    const { commands } = app;

    commands.addCommand(CREATE_SPK_COMMAND_ID, {
      label: 'New SPK File',
      icon: logoIcon,
      caption: 'Create a new SPK fike',
      execute: async args => {
        const cwd = (args['cwd'] ?? '') as string;
        const contentsManager = app.serviceManager.contents;

        const spkContent =
          args['spkContent'] ??
          spkFactory({
            name: 'Untitled',
            framework: (args['framework'] ?? '') as string
          });

        await newFile({
          cwd,
          ext: '.spk',
          name: args['name'] as string | undefined,
          content: spkContent as string,
          contentsManager
        });
      }
    });

    launcher.add({
      command: CREATE_SPK_COMMAND_ID,
      category: 'JupyterPack',
      rank: 1
    });
    const iconMap = {
      [JupyterPackFramework.DASH]: dashIcon,
      [JupyterPackFramework.STREAMLIT]: streamlitIcon,
      [JupyterPackFramework.SHINY]: shinyIcon,
      [JupyterPackFramework.PANEL]: panelIcon,
      [JupyterPackFramework.TEXTUAL]: textualIcon,
      [JupyterPackFramework.VIZRO]: vizroIcon,
      [JupyterPackFramework.FASTHTML]: fasthtmlIcon
    };
    Object.entries(iconMap).forEach(([framework, icon], index) => {
      addLauncherCommands({
        app,
        launcher,
        framework: framework as JupyterPackFramework,
        icon,
        rank: index + 2
      });
    });
  }
};

export const spkFromLink: JupyterFrontEndPlugin<void> = {
  id: 'jupyterpack:spkFromLink',
  requires: [IDocumentManager],
  autoStart: true,
  activate: (app: JupyterFrontEnd, docManager: IDocumentManager): void => {
    const queryParams = new URLSearchParams(window.location.search);
    const spkLink = queryParams.has('spk-link');
    if (spkLink && window.location.hash) {
      const linkData = window.location.hash.slice(1);
      app.restored.then(async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        const { spk, entry } = decodeSpk(linkData);
        const contentsManager = app.serviceManager.contents;

        await newFile({
          cwd: '',
          name: '__entry_from_link__.py',
          ext: '.py',
          content: entry,
          contentsManager,
          overwrite: true
        });
        spk.name = '__spk_from_link__';
        spk.entry = '__entry_from_link__.py';
        const spkContent = JSON.stringify(spk, null, 2);
        await newFile({
          cwd: '',
          name: '__spk_from_link__.spk',
          ext: '.spk',
          content: spkContent,
          contentsManager,
          overwrite: true
        });
        await new Promise(resolve => setTimeout(resolve, 200));
        let count = 0;
        const tryOpen = () => {
          const widget = docManager.openOrReveal(
            '__spk_from_link__.spk',
            'default'
          );
          if (widget) {
            app.shell.add(widget, 'main');
          } else {
            count++;
            if (count > 10) {
              return;
            }
            setTimeout(tryOpen, 100);
          }
        };
        tryOpen();
      });
    }
  }
};
