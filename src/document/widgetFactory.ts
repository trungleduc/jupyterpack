import { ABCWidgetFactory, DocumentRegistry } from '@jupyterlab/docregistry';
import { CommandRegistry } from '@lumino/commands';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { IEditorMimeTypeService } from '@jupyterlab/codeeditor';

import { ServiceManager } from '@jupyterlab/services';
import { SandpackDocModel } from './model';
import { SandpackWidget } from '../widget/sandpackWidget';
import { Widget } from '@lumino/widgets';

interface IOptions extends DocumentRegistry.IWidgetFactoryOptions {
  commands: CommandRegistry;

  manager?: ServiceManager.IManager;
  mimeTypeService?: IEditorMimeTypeService;
  rendermime?: IRenderMimeRegistry;
}

export class SandpackWidgetFactory extends ABCWidgetFactory<
  SandpackWidget,
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
  ): SandpackWidget {
    const { model } = context;

    const content = new Widget();
    model.contentChanged.connect(() => {
      content.node.innerHTML = model.toString();
    });

    return new SandpackWidget({ context, content });
  }
}
