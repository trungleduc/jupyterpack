import { JupyterFrontEnd } from '@jupyterlab/application';
import { PageConfig, PathExt, URLExt } from '@jupyterlab/coreutils';
import { ILauncher } from '@jupyterlab/launcher';
import { copyIcon, LabIcon, refreshIcon } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { Panel } from '@lumino/widgets';

import { autoReloadIcon, encodeSpk, linkIcon } from '../tools';
import {
  IJupyterpackDocTracker,
  IJupyterPackFileFormat,
  JupyterPackFramework
} from '../type';
import { IFramePanel } from './iframePanel';
import { generateAppFiles } from './templates';
import { Contents } from '@jupyterlab/services';

export const CommandIDs = {
  RELOAD: 'jupyterpack:reload',
  TOGGLE_AUTORELOAD: 'jupyterpack:toggleAutoreload',
  OPEN_SPECTA: 'jupyterpack:openInSpecta',
  COPY_LINK: 'jupyterpack:copyEncodedLink'
};

const labBaseUrl = PageConfig.getOption('baseUrl');

function getCurrentIframPanel(
  tracker: IJupyterpackDocTracker
): IFramePanel | undefined {
  const current = tracker.currentWidget?.content as Panel | undefined;
  if (!current) {
    return;
  }
  const widget = current.widgets[0] as IFramePanel | undefined;
  if (!widget) {
    return;
  }
  return widget;
}
export function addCommands(
  commands: CommandRegistry,
  tracker: IJupyterpackDocTracker,
  contentsManager: Contents.IManager
) {
  commands.addCommand(CommandIDs.RELOAD, {
    caption: 'Reload',
    isEnabled: () => {
      return tracker.currentWidget !== null;
    },
    icon: refreshIcon,
    execute: async () => {
      const widget = getCurrentIframPanel(tracker);
      if (widget) {
        await widget.reload();
      }
    }
  });
  const commandState = { toggled: false };
  commands.addCommand(CommandIDs.TOGGLE_AUTORELOAD, {
    isEnabled: () => {
      return tracker.currentWidget !== null;
    },
    isToggled: () => {
      const widget = getCurrentIframPanel(tracker);
      return Boolean(widget?.autoreload);
    },
    icon: autoReloadIcon,
    caption: e => {
      return commandState.toggled
        ? 'Auto-reload enabled'
        : 'Auto-reload disabled';
    },
    execute: async () => {
      const widget = getCurrentIframPanel(tracker);
      if (widget) {
        widget.autoreload = !widget?.autoreload;

        commands.notifyCommandChanged(CommandIDs.TOGGLE_AUTORELOAD);
      }
    }
  });
  commands.addCommand(CommandIDs.OPEN_SPECTA, {
    caption: 'Open in Specta',
    isEnabled: () => {
      return tracker.currentWidget !== null;
    },
    icon: linkIcon,
    execute: async () => {
      const context = tracker.currentWidget?.context;
      if (!context) {
        return;
      }
      const spectaUrl = new URL(
        URLExt.join(labBaseUrl, 'specta'),
        window.location.origin
      );
      spectaUrl.searchParams.set('path', context.path);
      window.open(spectaUrl.toString(), '_blank');
    }
  });
  commands.addCommand(CommandIDs.COPY_LINK, {
    caption: 'Copy link to clipboard',
    isEnabled: () => {
      return tracker.currentWidget !== null;
    },
    icon: copyIcon,
    execute: async () => {
      const context = tracker.currentWidget?.context;
      if (!context) {
        return;
      }
      await context.ready;
      const filePath = context.localPath;
      const spkContent =
        context.model.toJSON() as any as IJupyterPackFileFormat;
      const entryPath = PathExt.join(
        PathExt.dirname(filePath),
        spkContent.entry
      );
      const entryContent = await contentsManager.get(entryPath, {
        content: true,
        format: 'text'
      });
      const encodedData = encodeSpk({
        spkContent: JSON.stringify(spkContent),
        entryContent: entryContent.content
      });
      const spectaUrl = new URL(
        URLExt.join(labBaseUrl, 'specta'),
        window.location.origin
      );
      spectaUrl.searchParams.set('no-tree', 'true');
      spectaUrl.searchParams.set('spk-link', '');
      spectaUrl.hash = encodedData;

      await navigator.clipboard.writeText(spectaUrl.toString());
    }
  });
}

export function addLauncherCommands(options: {
  app: JupyterFrontEnd;
  launcher: ILauncher;
  framework: JupyterPackFramework;
  icon: LabIcon;
  rank: number;
}) {
  const { app, launcher, framework, icon, rank } = options;
  const { commands } = app;
  const commandId = `jupyterpack:create-${framework}-app`;

  const frameworkName = framework.charAt(0).toUpperCase() + framework.slice(1);
  commands.addCommand(commandId, {
    label: `${frameworkName} App`,
    icon: icon,
    caption: `Create a new ${frameworkName} Application`,
    execute: async args => {
      const cwd = args['cwd'] as string;
      await generateAppFiles({
        contentsManager: app.serviceManager.contents,
        cwd,
        framework
      });
    }
  });
  launcher.add({
    command: commandId,
    category: 'JupyterPack',
    rank
  });
}
