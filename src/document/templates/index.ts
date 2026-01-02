import { Contents } from '@jupyterlab/services';
import { JupyterPackFramework } from '../../type';
import { DASH_APP } from './dash';
import { STREAMLIT_APP } from './streamlit';
import { SHINY_APP } from './shiny';
import { newDirectory } from '../../tools';
import { PathExt } from '@jupyterlab/coreutils';
import { PANEL_APP } from './panel';

export async function generateAppFiles(options: {
  contentsManager: Contents.IManager;
  framework: JupyterPackFramework;
  cwd: string;
}) {
  const { contentsManager, framework, cwd } = options;
  const newPath = await newDirectory({
    dirName: `${framework} app`,
    contentsManager,
    cwd
  });
  let pyModel = await contentsManager.newUntitled({
    path: newPath,
    type: 'file',
    ext: '.py'
  });
  let appContent = '';
  switch (framework) {
    case JupyterPackFramework.DASH: {
      appContent = DASH_APP;
      break;
    }
    case JupyterPackFramework.STREAMLIT: {
      appContent = STREAMLIT_APP;
      break;
    }
    case JupyterPackFramework.SHINY: {
      appContent = SHINY_APP;
      break;
    }
    case JupyterPackFramework.PANEL: {
      appContent = PANEL_APP;
      break;
    }
    default:
      break;
  }
  await contentsManager.save(pyModel.path, {
    ...pyModel,
    format: 'text',
    size: undefined,
    content: appContent
  });

  pyModel = await contentsManager.rename(
    pyModel.path,
    PathExt.join(newPath, 'app.py')
  );

  let model = await contentsManager.newUntitled({
    path: newPath,
    type: 'file',
    ext: '.spk'
  });

  const spkContent = `
{
  "name": "entrypoint.spk",
  "entry": "${pyModel.name}",
  "framework": "${framework}",
  "dependencies": {
    "mamba": []
  }
}  
`;
  model = await contentsManager.save(model.path, {
    ...model,
    format: 'text',
    size: undefined,
    content: spkContent
  });

  await contentsManager.rename(
    model.path,
    PathExt.join(newPath, 'entrypoint.spk')
  );
}
