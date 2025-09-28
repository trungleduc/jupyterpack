import { Token } from '@lumino/coreutils';
import { IConnectionManager } from './type';

export const IConnectionManagerToken = new Token<IConnectionManager>(
  'jupyterpack:connection-manager'
);
