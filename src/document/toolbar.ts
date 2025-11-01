import { ReactiveToolbar, ToolbarButton } from '@jupyterlab/ui-components';
import { Panel } from '@lumino/widgets';

import { IJupyterpackDocTracker, IPythonWidgetModel } from '../type';

export class ToolbarWidget extends ReactiveToolbar {
  constructor(options: { tracker: IJupyterpackDocTracker }) {
    super();
    this._tracker = options.tracker;
    console.log('tracker', this._tracker);
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
    const model = (current.widgets[0] as any)?.model as
      | IPythonWidgetModel
      | undefined;
    if (!model) {
      return;
    }
    await model.reload();
  };
  private _tracker: IJupyterpackDocTracker;
}
