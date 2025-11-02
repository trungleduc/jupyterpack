import {
  CommandToolbarButton,
  ReactiveToolbar,
  ToolbarButton
} from '@jupyterlab/ui-components';
import { Panel } from '@lumino/widgets';

import { IJupyterpackDocTracker } from '../type';
import { IFramePanel } from './iframePanel';
import { CommandRegistry } from '@lumino/commands';
import { CommandIDs } from './commands';

export class ToolbarWidget extends ReactiveToolbar {
  constructor(options: {
    tracker: IJupyterpackDocTracker;
    commands: CommandRegistry;
  }) {
    super();
    this._tracker = options.tracker;
    this.addClass('jupyterpack-toolbar');
    this.addItem(
      'Reload',
      new ToolbarButton({
        icon: 'refresh',
        tooltip: 'Reload',
        onClick: this._reload
      })
    );
    this.addItem(
      'Toggle Auto Reload',
      new CommandToolbarButton({
        id: CommandIDs.TOGGLE_AUTORELOAD,
        commands: options.commands
      })
    );
  }

  private _reload = async () => {
    const current = this._tracker.currentWidget?.content as Panel | undefined;
    if (!current) {
      return;
    }
    const widget = current.widgets[0] as IFramePanel | undefined;
    if (!widget) {
      return;
    }

    await widget.reload();
  };
  private _tracker: IJupyterpackDocTracker;
}
