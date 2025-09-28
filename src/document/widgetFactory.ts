import { ABCWidgetFactory, DocumentRegistry } from '@jupyterlab/docregistry';
import { Contents, ServiceManager } from '@jupyterlab/services';
import { CommandRegistry } from '@lumino/commands';
import { Panel } from '@lumino/widgets';

import {
  IConnectionManager,
  IJupyterPackFileFormat,
  JupyterPackFramework
} from '../type';
import { SandpackPanel } from '../sandpackWidget/sandpackPanel';
import { JupyterPackDocWidget } from './jupyterpackDocWidget';
import { PythonWidgetModel } from '../pythonWidget/pythonWidgetModel';
import { UUID } from '@lumino/coreutils';
import { PythonWidget } from '../pythonWidget/pythonWidget';

interface IOptions extends DocumentRegistry.IWidgetFactoryOptions {
  commands: CommandRegistry;
  manager: ServiceManager.IManager;
  connectionManager: IConnectionManager;
}

export class JupyterPackWidgetFactory extends ABCWidgetFactory<JupyterPackDocWidget> {
  constructor(private options: IOptions) {
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
    context: DocumentRegistry.IContext<DocumentRegistry.IModel>
  ): JupyterPackDocWidget {
    const content = new Panel();
    content.addClass('jp-jupyterpack-document-panel');
    context.ready.then(() => {
      const jpackModel =
        context.model.toJSON() as any as IJupyterPackFileFormat;
      switch (jpackModel.framework) {
        case JupyterPackFramework.REACT: {
          const jpContent = new SandpackPanel({
            context,
            contentsManager: this._contentsManager
          });
          content.addWidget(jpContent);
          break;
        }
        case JupyterPackFramework.DASH: {
          const model = new PythonWidgetModel({
            context,
            manager: this.options.manager,
            contentsManager: this._contentsManager,
            connectionManager: this.options.connectionManager
          });
          const pythonWidget = new PythonWidget({
            model,
            id: UUID.uuid4()
          });
          content.addWidget(pythonWidget);
          break;
        }
        default: {
          console.error('Unsupported framework');
          break;
        }
      }
    });
    return new JupyterPackDocWidget({
      context,
      content
    });
  }

  private _contentsManager: Contents.IManager;
}
