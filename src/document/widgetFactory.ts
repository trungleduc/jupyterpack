import { IEditorMimeTypeService } from '@jupyterlab/codeeditor';
import { ABCWidgetFactory, DocumentRegistry } from '@jupyterlab/docregistry';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ServiceManager } from '@jupyterlab/services';
import { CommandRegistry } from '@lumino/commands';

import { SandpackPanel } from '../widget/sandpackPanel';
import { SandpackDocModel } from './model';
import { SandpackDocWidget } from './sandpackDocWidget';

interface IOptions extends DocumentRegistry.IWidgetFactoryOptions {
  commands: CommandRegistry;

  manager?: ServiceManager.IManager;
  mimeTypeService?: IEditorMimeTypeService;
  rendermime?: IRenderMimeRegistry;
}

export class SandpackWidgetFactory extends ABCWidgetFactory<
  SandpackDocWidget,
  SandpackDocModel
> {
  constructor(options: IOptions) {
    super(options);
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
    // const { model } = context;

    const content = new SandpackPanel();

    return new SandpackDocWidget({ context, content });
  }
}
