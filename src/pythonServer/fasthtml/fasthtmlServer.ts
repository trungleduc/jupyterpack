import { IPythonServerInitOptions, JupyterPackFramework } from '../../type';
import { FastAPIServer } from '../fastapi/fastapiServer';

import { DEPENDENCIES } from './deps';

export class FastHTMLServer extends FastAPIServer {
  framework = JupyterPackFramework.FASTHTML;
  async init(options: IPythonServerInitOptions) {
    const mergedOptions: IPythonServerInitOptions = {
      ...options,
      dependencies: this.mergeDependencies(options.dependencies, DEPENDENCIES)
    };
    await super.init(mergedOptions);
  }
}
