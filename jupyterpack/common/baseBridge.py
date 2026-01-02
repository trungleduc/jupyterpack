from abc import ABC, abstractmethod
from typing import Dict, Optional


class BaseBridge(ABC):
    @abstractmethod
    async def fetch(self, request: Dict) -> Dict:
        """
        request: {body: Optional[bytes], headers: List[Tuple[str, str]], method: str, url: str}
        """
        pass

    @abstractmethod
    async def open_ws(
        self,
        instance_id: str,
        kernel_client_id: str,
        ws_url: str,
        protocols_str: Optional[str] = None,
        broadcast_channel_suffix: Optional[str] = None,
    ) -> None:
        pass

    @abstractmethod
    async def close_ws(
        self,
        instance_id: str,
        kernel_client_id: str,
        ws_url: str,
        broadcast_channel_suffix: Optional[str] = None,
    ) -> None:
        pass

    @abstractmethod
    async def receive_ws_message_from_js(
        self, instance_id: str, kernel_client_id: str, ws_url: str, payload_message: str
    ) -> None:
        pass

    @abstractmethod
    def send_ws_message_to_js(
        self,
        instance_id: str,
        kernel_client_id: str,
        ws_url: str,
        msg: str | bytes,
        action: str = "backend_message",
    ) -> None:
        pass
