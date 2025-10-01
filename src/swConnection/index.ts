import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import { UUID } from '@lumino/coreutils';
import { expose } from 'comlink';

import { IConnectionManagerToken } from '../token';
import { IConnectionManager, MessageAction } from '../type';
import { ConnectionManager } from './connection_manager';

const fullLabextensionsUrl = PageConfig.getOption('fullLabextensionsUrl');
const SCOPE = `${fullLabextensionsUrl}/jupyterpack/static`;
async function initServiceWorker(): Promise<ServiceWorker | undefined | null> {
  if (!('serviceWorker' in navigator)) {
    console.error('Cannot start extension without service worker');

    return;
  }

  const fullWorkerUrl = `${SCOPE}/service-worker.js`;

  try {
    const reg = await navigator.serviceWorker.register(fullWorkerUrl);

    if (!reg) {
      console.error('Missing service worker registration');
      return;
    }
    await reg.update();
    if (reg.installing) {
      const sw = reg.installing || reg.waiting;
      sw.onstatechange = () => {
        if (sw.state === 'installed') {
          window.location.reload();
        }
      };
    }
    if (reg.active) {
      return reg.active;
    }

    console.log(
      'Service worker newly registered',
      await navigator.serviceWorker.getRegistration(fullWorkerUrl)
    );
    return reg.active;
  } catch (e) {
    console.error('Failed to register service worker', e);

    return;
  }
}

function createPingFrame() {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = URLExt.join(SCOPE, '__jupyterpack__', 'ping.html');
  document.body.appendChild(iframe);
}

export const swPlugin: JupyterFrontEndPlugin<IConnectionManager> = {
  id: 'jupyterpack:service-worker-plugin',
  description: 'jupyterpack service worker plugin',
  autoStart: true,
  provides: IConnectionManagerToken,
  activate: async (app: JupyterFrontEnd): Promise<IConnectionManager> => {
    console.log('Activating jupyterpack service worker');
    const serviceWorker = await initServiceWorker();
    if (!serviceWorker) {
      throw new Error(
        'Failed to register the Service Worker, please make sure to use a browser that supports this feature.'
      );
    }

    const instanceId = UUID.uuid4();
    const { port1: mainToServiceWorker, port2: serviceWorkerToMain } =
      new MessageChannel();

    const connectionManager = new ConnectionManager(instanceId);
    expose(connectionManager, mainToServiceWorker);
    serviceWorker.postMessage(
      { type: MessageAction.INIT, data: { instanceId } },
      [serviceWorkerToMain]
    );
    setTimeout(() => {
      createPingFrame();
    }, 10000);

    return connectionManager;
  }
};
