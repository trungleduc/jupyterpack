import * as React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { SandpackWidget } from './sandpackWidget';
export class SandpackPanel extends ReactWidget {
  constructor() {
    super();
    this.addClass('jp-SandpackPanel');
  }

  render(): JSX.Element {
    return <SandpackWidget />;
  }
}
