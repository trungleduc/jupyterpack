import { CommandRegistry } from '@lumino/commands';
import { IJupyterpackDocTracker } from '../type';
import { Panel } from '@lumino/widgets';
import { IFramePanel } from './iframePanel';
import { autoReloadIcon } from '../tools';

export const CommandIDs = {
  RELOAD: 'jupyterpack:reload',
  TOGGLE_AUTORELOAD: 'jupyterpack:toggleAutoreload'
};

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
    label: 'Reload',
    isEnabled: () => {
      return tracker.currentWidget !== null;
    },
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
}
