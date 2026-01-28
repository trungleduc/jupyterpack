import { PathExt } from '@jupyterlab/coreutils';
import { Contents } from '@jupyterlab/services';

import { newDirectory, pathExists } from '../../tools';
import { JupyterPackFramework } from '../../type';
import { DASH_APP } from './dash';
import { PANEL_APP } from './panel';
import { SHINY_APP } from './shiny';
import { STREAMLIT_APP } from './streamlit';
import { TEXTUAL_APP } from './textual';
import { VIZRO_APP } from './vizro';
import { FASTHTML_APP } from './fasthtml';
import { GRADIO_APP } from './gradio';
import { MESOP_APP } from './mesop';

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
    case JupyterPackFramework.TEXTUAL: {
      appContent = TEXTUAL_APP;
      break;
    }
    case JupyterPackFramework.VIZRO: {
      appContent = VIZRO_APP;
      break;
    }
    case JupyterPackFramework.FASTHTML: {
      appContent = FASTHTML_APP;
      break;
    }
    case JupyterPackFramework.GRADIO: {
      appContent = GRADIO_APP;
      break;
    }
    case JupyterPackFramework.MESOP: {
      appContent = MESOP_APP;
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

export async function newFile(options: {
  cwd: string;
  name?: string;
  ext: string;
  content: string;
  contentsManager: Contents.IManager;
  overwrite?: boolean;
}) {
  const { cwd, name, content, contentsManager, ext, overwrite } = options;
  let model = await contentsManager.newUntitled({
    path: cwd,
    type: 'file',
    ext
  });
  model = await contentsManager.save(model.path, {
    ...model,
    format: 'text',
    size: undefined,
    content
  });
  if (name) {
    if (overwrite && (await pathExists(cwd, name, contentsManager))) {
      await contentsManager.delete(PathExt.join(cwd, name));
    }
    await contentsManager.rename(model.path, PathExt.join(cwd, name));
  }
}
