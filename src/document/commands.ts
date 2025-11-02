import { refreshIcon } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { Panel } from '@lumino/widgets';

import { autoReloadIcon, linkIcon } from '../tools';
import { IJupyterpackDocTracker } from '../type';
import { IFramePanel } from './iframePanel';
import { PageConfig, URLExt } from '@jupyterlab/coreutils';

export const CommandIDs = {
  RELOAD: 'jupyterpack:reload',
  TOGGLE_AUTORELOAD: 'jupyterpack:toggleAutoreload',
  OPEN_SPECTA: 'jupyterpack:openInSpecta'
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
  tracker: IJupyterpackDocTracker
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
}
