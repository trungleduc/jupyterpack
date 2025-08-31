import { Contents } from '@jupyterlab/services';
import { ISignal, Signal } from '@lumino/signaling';

import { IDict } from '../type';
import { removePrefix } from '../tools';

export class SandpackFilesModel {
  constructor(options: { contentsManager: Contents.IManager; path: string }) {
    this._contentManager = options.contentsManager;
    this._path = options.path;
    this._contentManager.fileChanged.connect(this._onFileChanged, this);
  }

  async getAllFiles(): Promise<IDict<{ code: string }>> {
    if (!this._allFiles) {
      const files = await this._contentManager.get(this._path, {
        content: true
      });
      this._allFiles = await this.flattenDirectory(files);
    }

    return this._allFiles;
  }

  get fileChanged(): ISignal<
    SandpackFilesModel,
    { allFiles: IDict<{ code: string }> }
  > {
    return this._fileChanged;
  }

  async flattenDirectory(
    dirContent: Contents.IModel
  ): Promise<IDict<{ code: string }>> {
    const flatDict: IDict<{ code: string }> = {};
    const content = dirContent.content as Contents.IModel[];

    for (const item of content) {
      if (item.type === 'file') {
        const pathWithoutRoot = this._removeRoot(item.path);
        let itemContent = item;
        if (!itemContent.content) {
          itemContent = await this._getContent(item.path);
        }
        if (
          itemContent.mimetype === 'application/json' &&
          typeof itemContent.content !== 'string'
        ) {
          flatDict[pathWithoutRoot] = {
            code: JSON.stringify(itemContent.content)
          };
        } else {
          flatDict[pathWithoutRoot] = { code: itemContent.content };
        }
      } else if (item.type === 'directory') {
        // If it's a directory, recursively flatten its content
        const nestedContent = await this._getContent(item.path);
        const nestedDict = await this.flattenDirectory(nestedContent);
        Object.assign(flatDict, nestedDict);
      }
    }
    return flatDict;
  }

  private async _onFileChanged(
    sender: Contents.IManager,
    args: Contents.IChangedArgs
  ) {
    switch (args.type) {
      case 'save': {
        if (args.newValue?.path) {
          const newContent = await this._getContent(args.newValue.path);
          const pathWithoutRoot = this._removeRoot(args.newValue.path);
          if (this._allFiles) {
            this._allFiles[pathWithoutRoot] = {
              code: newContent.content
            };
          }
        }
        break;
      }
      case 'delete': {
        if (args.oldValue?.path) {
          const pathWithoutRoot = this._removeRoot(args.oldValue.path);
          if (this._allFiles) {
            delete this._allFiles[pathWithoutRoot];
          }
        }
        break;
      }
      case 'rename': {
        if (args.oldValue?.path && args.newValue?.path) {
          const oldPathWithoutRoot = this._removeRoot(args.oldValue.path);
          const newPathWithoutRoot = this._removeRoot(args.newValue.path);
          if (this._allFiles) {
            this._allFiles[newPathWithoutRoot] =
              this._allFiles[oldPathWithoutRoot];
            delete this._allFiles[newPathWithoutRoot];
          }
        }
        break;
      }
      case 'new': {
        if (args.newValue?.path) {
          const newContent = await this._getContent(args.newValue.path);
          const pathWithoutRoot = this._removeRoot(args.newValue.path);
          if (this._allFiles) {
            this._allFiles[pathWithoutRoot] = {
              code: newContent.content
            };
          }
        }
        break;
      }

      default:
        break;
    }
    if (this._allFiles) {
      this._fileChanged.emit({
        allFiles: this._allFiles
      });
    }
  }

  private _removeRoot(path: string): string {
    return removePrefix(path, this._path);
  }
  private _getContent(path: string): Promise<Contents.IModel> {
    return this._contentManager.get(path, { content: true });
  }
  private _path: string;
  private _fileChanged = new Signal<
    this,
    { allFiles: IDict<{ code: string }> }
  >(this);

  private _contentManager: Contents.IManager;

  private _allFiles?: IDict<{ code: string }>;
}
