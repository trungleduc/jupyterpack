import { ReactiveToolbar, ToolbarButton } from '@jupyterlab/ui-components';
import { Panel } from '@lumino/widgets';

import { IJupyterpackDocTracker } from '../type';
import { IFramePanel } from './iframePanel';

export class ToolbarWidget extends ReactiveToolbar {
  constructor(options: { tracker: IJupyterpackDocTracker }) {
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
