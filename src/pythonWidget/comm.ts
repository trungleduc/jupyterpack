import { Kernel, KernelMessage } from '@jupyterlab/services';

const COMM_NAME = 'jupyterpack:broadcast:comm';

export class CommBroadcastManager {
  constructor() {
    this._kernels = new Map();
    this._comms = new Map();
  }

  registerKernel(kernel: Kernel.IKernelConnection) {
    this._kernels.set(kernel.id, kernel);
    kernel.registerCommTarget(COMM_NAME, (comm, msg) =>
      this._handle_comm_open(comm, msg, kernel.id)
    );
  }
  unregisterKernel(kernelId?: string) {
    if (kernelId) {
      this._kernels.delete(kernelId);
      const comms = this._comms.get(kernelId) ?? [];
      comms.forEach(comm => comm.dispose());
      this._comms.delete(kernelId);
    }
  }

  private _handle_comm_open = async (
    comm: Kernel.IComm,
    msg: KernelMessage.ICommOpenMsg,
    kernelId: string
  ): Promise<void> => {
    if (this._comms.has(kernelId)) {
      this._comms.get(kernelId)?.push(comm);
    } else {
      this._comms.set(kernelId, [comm]);
    }
    const channelName = msg.metadata.channel_name as string | undefined;
    if (!channelName) {
      return;
    }
    if (!this._broadcastChannels.has(channelName)) {
      this._broadcastChannels.set(
        channelName,
        new BroadcastChannel(channelName)
      );
    }
    const broadcastChannel = this._broadcastChannels.get(channelName)!;
    comm.onMsg = commMsg => {
      const { data } = commMsg.content;
      broadcastChannel.postMessage(data);
    };
  };

  dispose() {
    this._kernels.clear();
    this._comms.clear();
    this._broadcastChannels.forEach(it => {
      it.close();
    });
    this._broadcastChannels.clear();
  }

  private _kernels: Map<string, Kernel.IKernelConnection> = new Map();
  private _comms: Map<string, Kernel.IComm[]> = new Map();
  private _broadcastChannels: Map<string, BroadcastChannel> = new Map();
}
