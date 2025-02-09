import { DocumentChange, YDocument } from '@jupyter/ydoc';
import * as Y from 'yjs';

export class SandpackDoc extends YDocument<DocumentChange> {
  constructor() {
    super();
    this._source = this.ydoc.getText('source');
    this._source.observe(this._sourcesObserver);
  }

  set source(value: string) {
    this.transact(() => {
      this._source.insert(0, value);
    });
  }

  get source(): string {
    return this._source.toString();
  }

  editable = true;

  dispose(): void {
    super.dispose();
  }

  get version(): string {
    return '1.0.0';
  }

  getSource(): string {
    const content = this._source.toString();
    return content;
  }

  setSource(value: string): void {
    if (!value) {
      return;
    }
    this.transact(() => {
      this._source.insert(0, value);
    });
  }

  static create() {
    return new SandpackDoc();
  }

  private _sourcesObserver = (): void => {
    this._changed.emit({});
  };

  private _source: Y.Text;
}
