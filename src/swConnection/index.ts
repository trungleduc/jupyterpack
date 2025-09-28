import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { PageConfig } from '@jupyterlab/coreutils';
import { UUID } from '@lumino/coreutils';
import { expose } from 'comlink';

import { IConnectionManagerToken } from '../token';
import { IConnectionManager, MessageAction } from '../type';
import { ConnectionManager } from './connection_manager';

export async function initServiceWorker(): Promise<
  ServiceWorker | undefined | null
> {
  if (!('serviceWorker' in navigator)) {
    console.error('Cannot start extension without service worker');

    return;
  }
  const fullLabextensionsUrl = PageConfig.getOption('fullLabextensionsUrl');
  const SCOPE = `${fullLabextensionsUrl}/jupyterpack/static`;
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

/**
 * Initialization data for the jupyter-monstra extension.
 */
export const swPlugin: JupyterFrontEndPlugin<IConnectionManager> = {
  id: 'jupyter-monstra:plugin',
  description: 'A JupyterLab extension.',
  autoStart: true,
  provides: IConnectionManagerToken,
  activate: async (app: JupyterFrontEnd): Promise<IConnectionManager> => {
    console.log('JupyterLab extension jupyter-monstra is activated!');
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
    return connectionManager;
  }
};
