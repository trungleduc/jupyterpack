import { Widget } from '@lumino/widgets';

export class IFramePanel extends Widget {
  constructor() {
    super();
    this.addClass('jupyterpack-iframe-panel');

    this._iframe = document.createElement('iframe');
    this._spinner = document.createElement('div');
    this._spinner.classList.add('jupyterpack-spinner');
    this.node.appendChild(this._spinner);
    this.node.appendChild(this._iframe);
  }

  toggleSpinner(show: boolean): void {
    if (show) {
      this._spinner.style.display = 'unset';
    } else {
      this._spinner.style.display = 'none';
    }
  }

  protected _iframe: HTMLIFrameElement;
  protected _spinner: HTMLDivElement;
}
