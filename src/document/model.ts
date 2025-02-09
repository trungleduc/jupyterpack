import { DocumentRegistry } from '@jupyterlab/docregistry';
import { SandpackDoc } from './doc';
import { IChangedArgs } from '@jupyterlab/coreutils';
import { ISignal, Signal } from '@lumino/signaling';

/**
 * DocumentModel: this Model represents the content of the file
 */
export class SandpackDocModel implements DocumentRegistry.IModel {
  constructor(options: DocumentRegistry.IModelOptions<SandpackDoc>) {
    const { sharedModel } = options;
    if (sharedModel) {
      this._sharedModel = sharedModel;
    } else {
      this._sharedModel = this.createSharedModel();
    }
    this._sharedModel.changed.connect(this._onSharedModelChanged);
  }

  readonly collaborative = false;

  get sharedModel(): SandpackDoc {
    return this._sharedModel;
  }

  get dirty(): boolean {
    return this._dirty;
  }
  set dirty(value: boolean) {
    this._dirty = value;
  }

  get readOnly(): boolean {
    return this._readOnly;
  }
  set readOnly(value: boolean) {
    this._readOnly = value;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  get contentChanged(): ISignal<this, void> {
    return this._contentChanged;
  }

  get stateChanged(): ISignal<this, IChangedArgs<any, any, string>> {
    return this._stateChanged;
  }

  dispose(): void {
    //
  }
  toString(): string {
    return this.sharedModel.getSource();
  }

  fromString(data: string): void {
    this.sharedModel.setSource(data);

    this.dirty = true;
  }

  toJSON(): any {
    return JSON.parse(this.toString());
  }

  fromJSON(data: any): void {
    // nothing to do
  }

  protected createSharedModel(): SandpackDoc {
    return SandpackDoc.create();
  }

  private _onSharedModelChanged = (sender: any, changes: any): void => {
    this._contentChanged.emit(void 0);
  };

  private _sharedModel: SandpackDoc;
  private _dirty = false;
  readonly defaultKernelName: string = '';
  readonly defaultKernelLanguage: string = '';
  private _readOnly = false;
  private _isDisposed = false;
  private _contentChanged = new Signal<this, void>(this);
  private _stateChanged = new Signal<this, IChangedArgs<any>>(this);
}
