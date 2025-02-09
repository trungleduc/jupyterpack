import { DocumentRegistry } from '@jupyterlab/docregistry';
import { Contents } from '@jupyterlab/services';
import { SandpackDocModel } from './model';
import { SandpackDoc } from './doc';

/**
 * A Model factory to create new instances of JupyterCadModel.
 */
export class SandpackDocModelFactory
  implements DocumentRegistry.IModelFactory<SandpackDocModel>
{
  constructor() {}

  /**
   * Whether the model is collaborative or not.
   */
  readonly collaborative = false;

  /**
   * The name of the model.
   *
   * @returns The name
   */
  get name(): string {
    return 'sandpack-model';
  }

  /**
   * The content type of the file.
   *
   * @returns The content type
   */
  get contentType(): Contents.ContentType {
    return 'sandpack';
  }

  /**
   * The format of the file.
   *
   * @returns the file format
   */
  get fileFormat(): Contents.FileFormat {
    return 'text';
  }

  /**
   * Get whether the model factory has been disposed.
   *
   * @returns disposed status
   */
  get isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * Dispose the model factory.
   */
  dispose(): void {
    this._disposed = true;
  }

  preferredLanguage(path: string): string {
    return '';
  }

  createNew(
    options: DocumentRegistry.IModelOptions<SandpackDoc>
  ): SandpackDocModel {
    const model = new SandpackDocModel({
      sharedModel: options.sharedModel,
      languagePreference: options.languagePreference
    });
    return model;
  }
  private _disposed = false;
}
