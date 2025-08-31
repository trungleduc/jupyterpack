export interface IDict<T = any> {
  [key: string]: T;
}

export enum JupyterPackFramework {
  REACT = 'react',
  DASH = 'dash'
}
export interface IJupyterPackFileFormat {
  entry: string;
  framework: JupyterPackFramework;
  name?: string;
  metadata?: IDict;
}
