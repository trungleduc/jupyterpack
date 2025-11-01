import { ReactiveToolbar } from '@jupyterlab/ui-components';

export class ToolbarWidget extends ReactiveToolbar {
  constructor() {
    super();
    this.addClass('jupyterpack-toolbar');
  }
}
