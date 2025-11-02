import {
  CommandToolbarButton,
  ReactiveToolbar
} from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';

import { IJupyterpackDocTracker } from '../type';
import { CommandIDs } from './commands';

export class ToolbarWidget extends ReactiveToolbar {
  constructor(options: {
    tracker: IJupyterpackDocTracker;
    commands: CommandRegistry;
  }) {
    super();
    this.addClass('jupyterpack-toolbar');
    this.addItem(
      'Reload',
      new CommandToolbarButton({
        commands: options.commands,
        id: CommandIDs.RELOAD
      })
    );
    this.addItem(
      'Toggle Auto Reload',
      new CommandToolbarButton({
        id: CommandIDs.TOGGLE_AUTORELOAD,
        commands: options.commands
      })
    );
    this.addItem(
      'Open Specta',
      new CommandToolbarButton({
        id: CommandIDs.OPEN_SPECTA,
        commands: options.commands
      })
    );
  }
}
