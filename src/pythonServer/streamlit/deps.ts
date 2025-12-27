import { IDependencies } from '../../type';

export const DEPENDENCIES: IDependencies = {
  mamba: [
    'pyarrow',
    'altair',
    'blinker>=1.5.0,<2',
    'cachetools>=4.0,<7',
    'protobuf'
  ],
  pip: ['streamlit==1.50.0']
};
