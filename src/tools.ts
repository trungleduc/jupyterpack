import logoStr from '../style/icons/box.svg';
import autoReloadStr from '../style/icons/autoreload.svg';
import { LabIcon } from '@jupyterlab/ui-components';

export const logoIcon = new LabIcon({
  name: 'jupyterpack:logo',
  svgstr: logoStr
});

export const autoReloadIcon = new LabIcon({
  name: 'jupyterpack:autoReload',
  svgstr: autoReloadStr
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
