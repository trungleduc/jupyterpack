import { ToolbarButton } from '@jupyterlab/apputils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { CommandRegistry } from '@lumino/commands';
import { Widget } from '@lumino/widgets';

import { logoIcon } from '../tools';

export class SpkButtonExtention implements DocumentRegistry.IWidgetExtension<
  Widget,
  DocumentRegistry.IModel
> {
  constructor(commands: CommandRegistry) {
    this._commands = commands;
  }

  createNew(panel: Widget) {
    const button = new ToolbarButton({
      className: 'spkButton',
      icon: logoIcon,
      tooltip: 'Open with JupyterPack',
      onClick: () => {
        this._commands.execute('docmanager:open', {
          factory: 'jupyterpack',
          path: (panel as any).context.localPath
        });
      }
    });

    (panel as any).toolbar.addItem('openWithSpk', button);
    return button;
  }

  private _commands: CommandRegistry;
}
