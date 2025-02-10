import * as React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { SandpackWidget } from './sandpackWidget';
import { SandpackDocModel } from '../document/model';
export class SandpackPanel extends ReactWidget {
  constructor(options: { model: SandpackDocModel }) {
    super();
    this._model = options.model;
    this.addClass('jp-SandpackPanel');
  }

  render(): JSX.Element {
    return <SandpackWidget model={this._model} />;
  }

  private _model: SandpackDocModel;
}
