import { DocumentWidget } from '@jupyterlab/docregistry';

export class JupyterPackDocWidget extends DocumentWidget {
  constructor(options: DocumentWidget.IOptions) {
    super(options);
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this.content.dispose();
    super.dispose();
  }

  onResize = (msg: any): void => {
    window.dispatchEvent(new Event('resize'));
  };
}
