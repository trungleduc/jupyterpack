import { IPythonServerInitOptions, JupyterPackFramework } from '../../type';
import { StarletteServer } from '../starlette/starletteServer';
import { DEPENDENCIES } from './deps';

export class FastAPIServer extends StarletteServer {
  framework = JupyterPackFramework.FASTAPI;
  async init(options: IPythonServerInitOptions) {
    const mergedOptions: IPythonServerInitOptions = {
      ...options,
      dependencies: this.mergeDependencies(options.dependencies, DEPENDENCIES)
    };
    await super.init(mergedOptions);
  }
}
