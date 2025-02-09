import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the sandpyter extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'sandpyter:plugin',
  description: 'A JupyterLab extension for Sandpack.',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension sandpyter is activated!');
  }
};

export default plugin;
