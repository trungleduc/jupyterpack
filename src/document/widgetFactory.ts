import { ABCWidgetFactory, DocumentRegistry } from '@jupyterlab/docregistry';
import { ServiceManager, Contents } from '@jupyterlab/services';
import { CommandRegistry } from '@lumino/commands';

import { SandpackPanel } from '../widget/sandpackPanel';
import { SandpackDocModel } from './model';
import { SandpackDocWidget } from './sandpackDocWidget';

interface IOptions extends DocumentRegistry.IWidgetFactoryOptions {
  commands: CommandRegistry;
  manager: ServiceManager.IManager;
}

export class SandpackWidgetFactory extends ABCWidgetFactory<
  SandpackDocWidget,
  SandpackDocModel
> {
  constructor(options: IOptions) {
    super(options);
    this._contentsManager = options.manager.contents;
  }

  /**
   * Create a new widget given a context.
   *
   * @param context Contains the information of the file
   * @returns The widget
   */
  protected createNewWidget(
    context: DocumentRegistry.IContext<SandpackDocModel>
  ): SandpackDocWidget {
    const content = new SandpackPanel({
      context,
      contentsManager: this._contentsManager
    });

    return new SandpackDocWidget({
      context,
      content
    });
  }

  private _contentsManager: Contents.IManager;
}
