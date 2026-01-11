import { IDependencies } from '../../type';
import { DEPENDENCIES as DASH_DEPS } from '../dash/deps';
export const DEPENDENCIES: IDependencies = {
  mamba: ['vizro', ...(DASH_DEPS.mamba ?? [])],
  pip: [...(DASH_DEPS.pip ?? [])]
};
