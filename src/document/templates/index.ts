import { Contents } from '@jupyterlab/services';
import { JupyterPackFramework } from '../../type';
import { DASH_APP } from './dash';
import { STREAMLIT_APP } from './streamlit';
import { SHINY_APP } from './shiny';

export async function generateAppFiles(options: {
  contentsManager: Contents.IManager;
  framework: JupyterPackFramework;
  cwd: string;
}) {
  const { contentsManager, framework, cwd } = options;

  const pyModel = await contentsManager.newUntitled({
    path: cwd,
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
    default:
      break;
  }
  await contentsManager.save(pyModel.path, {
    ...pyModel,
    format: 'text',
    size: undefined,
    content: appContent
  });

  let model = await contentsManager.newUntitled({
    path: cwd,
    type: 'file',
    ext: '.spk'
  });

  const spkContent = `
{
  "name": "${model.name}",
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
}
