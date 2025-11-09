from .comm import create_widget_comm
from platform import platform

if "wasm" in platform():
    IS_WASM = True
else:
    IS_WASM = False


class BroadcastChannelOverComm:
    """
    Simulating BroadcastChannel in non-wasm environment using comm
    """

    def __init__(self, channel_name: str):
        self._comm = create_widget_comm(metadata={"channel_name": channel_name})

    def postMessage(self, message):
        self._comm.send(message)


# Even though BroadcastChannelOverComm works on both wasm and non-wasm,
# we still want to use BroadcastChannel in wasm environment to avoid
# the overhead of comm.
if IS_WASM:
    try:
        from pyjs import js
    except ImportError:
        try:
            import js
        except ImportError:
            js = None

    if js is None:
        BroadcastChannel = BroadcastChannelOverComm
    else:

        class BroadcastChannel:
            def __init__(self, channel_name: str):
                self._broadcast_channel = js.BroadcastChannel.new(channel_name)

            def postMessage(self, message):
                self._broadcast_channel.postMessage(message)

else:
    BroadcastChannel = BroadcastChannelOverComm
