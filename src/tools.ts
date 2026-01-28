import { PathExt } from '@jupyterlab/coreutils';
import { Contents } from '@jupyterlab/services';
import { LabIcon } from '@jupyterlab/ui-components';
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent
} from 'lz-string';

import autoReloadStr from '../style/icons/autoreload.svg';
import logoStr from '../style/icons/box.svg';
import copyStr from '../style/icons/copy.svg';
import linkStr from '../style/icons/externallink.svg';
import fasthtmlStr from '../style/icons/fasthtml.svg';
import panelStr from '../style/icons/panel_logo_stacked.svg';
import dashStr from '../style/icons/Plotly-Logo-Black.svg';
import shinyStr from '../style/icons/shiny-for-python.svg';
import streamlitStr from '../style/icons/streamlit-logo-primary.svg';
import textualStr from '../style/icons/textual.svg';
import vizroStr from '../style/icons/vizro.svg';
import gradioStr from '../style/icons/gradio.svg';
import mesopStr from '../style/icons/mesop.svg';
import { IJupyterPackFileFormat } from './type';

export const IS_LITE = !!document.getElementById('jupyter-lite-main');

export const logoIcon = new LabIcon({
  name: 'jupyterpack:logo',
  svgstr: logoStr
});

export const autoReloadIcon = new LabIcon({
  name: 'jupyterpack:autoReload',
  svgstr: autoReloadStr
});

export const linkIcon = new LabIcon({
  name: 'jupyterpack:externalLink',
  svgstr: linkStr
});

export const dashIcon = new LabIcon({
  name: 'jupyterpack:dashBlack',
  svgstr: dashStr
});

export const streamlitIcon = new LabIcon({
  name: 'jupyterpack:streamlitBlack',
  svgstr: streamlitStr
});

export const shinyIcon = new LabIcon({
  name: 'jupyterpack:shinyLogo',
  svgstr: shinyStr
});

export const panelIcon = new LabIcon({
  name: 'jupyterpack:panelLogo',
  svgstr: panelStr
});

export const textualIcon = new LabIcon({
  name: 'jupyterpack:textualLogo',
  svgstr: textualStr
});

export const vizroIcon = new LabIcon({
  name: 'jupyterpack:vizroLogo',
  svgstr: vizroStr
});

export const fasthtmlIcon = new LabIcon({
  name: 'jupyterpack:fasthtmlLogo',
  svgstr: fasthtmlStr
});

export const copyIcon = new LabIcon({
  name: 'jupyterpack:copyIcon',
  svgstr: copyStr
});

export const gradioIcon = new LabIcon({
  name: 'jupyterpack:gradioIcon',
  svgstr: gradioStr
});

export const mesopIcon = new LabIcon({
  name: 'jupyterpack:mesopIcon',
  svgstr: mesopStr
});

export function removePrefix(path: string, prefix: string): string {
  if (path.startsWith(prefix)) {
    return path.slice(prefix.length);
  }
  // If the prefix doesn't match, return the original path
  return path;
}

export function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 32768; // process in chunks for large buffers
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function base64ToString(base64: string): string {
  const bytes = base64ToArrayBuffer(base64);
  return new TextDecoder('utf-8').decode(bytes);
}

export function stringToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function stringOrNone(content?: string) {
  return content ? `"${content}"` : 'None';
}

export function isBinaryContentType(contentType?: string) {
  if (!contentType) {
    // no Content-Type → assume binary for safety
    return true;
  }

  contentType = contentType.toLowerCase().trim();

  const textTypes = [
    'text/',
    'application/json',
    'application/javascript',
    'application/xml',
    'application/xhtml+xml',
    'application/x-www-form-urlencoded',
    'application/sql',
    'application/graphql',
    'application/yaml'
  ];

  const binaryIndicators = [
    'image/',
    'audio/',
    'video/',
    'font/',
    'application/octet-stream',
    'application/pdf',
    'application/zip',
    'application/x-protobuf',
    'application/vnd'
  ];

  // Starts with text/ or one of the textual types
  if (textTypes.some(t => contentType.startsWith(t))) {
    return false;
  }

  // Starts with binary-indicating prefix
  if (binaryIndicators.some(t => contentType.startsWith(t))) {
    return true;
  }

  // If charset is specified → text
  if (contentType.includes('charset=')) {
    return false;
  }

  // Default: assume binary
  return true;
}

export async function pathExists(
  cwd: string,
  name: string,
  contentsManager: Contents.IManager
) {
  const currentDirContent = await contentsManager.get(cwd, {
    content: true
  });

  const allEntries = (
    (currentDirContent.content ?? []) as Contents.IModel[]
  ).map(c => c.name);
  return allEntries.includes(name);
}

export async function newDirectory(options: {
  dirName: string;
  contentsManager: Contents.IManager;
  cwd: string;
}): Promise<string> {
  const { dirName, contentsManager, cwd } = options;
  const currentDirContent = await contentsManager.get(cwd, {
    content: true
  });
  const allDir = ((currentDirContent.content ?? []) as Contents.IModel[]).map(
    c => c.name
  );

  let createdDir = dirName;
  if (allDir.includes(createdDir)) {
    let idx = 1;
    createdDir = `${dirName} (${idx})`;
    while (allDir.includes(createdDir)) {
      idx += 1;
      createdDir = `${dirName} (${idx})`;
    }
  }
  const res = await contentsManager.newUntitled({
    path: cwd,
    type: 'directory'
  });

  const renameRes = await contentsManager.rename(
    res.path,
    PathExt.join(cwd, createdDir)
  );
  return renameRes.path;
}

export function encodeSpk({
  spkContent,
  entryContent
}: {
  spkContent: string;
  entryContent: string;
}): string {
  const payload = {
    spk: spkContent,
    entry: entryContent
  };
  const text = JSON.stringify(payload);
  return compressToEncodedURIComponent(text);
}

export function decodeSpk(hash: string): {
  spk: IJupyterPackFileFormat;
  entry: string;
} {
  const payload = JSON.parse(decompressFromEncodedURIComponent(hash));
  return {
    spk: JSON.parse(payload.spk),
    entry: payload.entry
  };
}
