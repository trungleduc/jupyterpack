import { Token } from '@lumino/coreutils';
import { IConnectionManager, IJupyterpackDocTracker } from './type';

export const IConnectionManagerToken = new Token<IConnectionManager>(
  'jupyterpack:connection-manager'
);

export const IJupyterpackDocTrackerToken = new Token<IJupyterpackDocTracker>(
  'jupyterpack:dock-tracker'
);
