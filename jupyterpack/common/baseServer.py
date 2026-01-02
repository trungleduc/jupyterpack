from abc import ABC, abstractmethod
import base64
import json
from typing import Dict, Optional, Union

from .baseBridge import BaseBridge
from .tools import set_base_url_env


class BaseServer(ABC):
    def __init__(self, base_url: str, *args, **kwargs):
        super().__init__(*args, **kwargs)
        set_base_url_env(base_url)
        self._base_url = base_url

    @property
    @abstractmethod
    def bridge(self) -> Union[BaseBridge, None]:
        pass

    @property
    def base_url(self) -> str:
        return self._base_url

    @abstractmethod
    def dispose(self, *args, **kwargs) -> None:
        pass

    @abstractmethod
    def reload(self, *args, **kwargs) -> bool:
        pass

    async def get_response(
        self,
        method: str,
        url: str,
        headers: Dict,
        content: Optional[str] = None,
        params: Optional[str] = None,
    ) -> str:
        if self.bridge is None:
            raise Exception("Server bridge is not created")
        decoded_content = None
        if content is not None:
            decoded_content = base64.b64decode(content)
        req_dict = {
            "method": method,
            "url": url,
            "headers": list(headers.items()),
            "body": decoded_content,
            "params": params,
        }

        response = await self.bridge.fetch(req_dict)
        json_str = json.dumps(response)
        return json_str

    async def open_ws(
        self,
        instance_id: str,
        kernel_client_id: str,
        ws_url: str,
        protocols_str: str | None,
        broadcast_channel_suffix: str | None,
    ):
        if self.bridge is None:
            raise Exception("Server bridge is not created")
        try:
            await self.bridge.open_ws(
                instance_id,
                kernel_client_id,
                ws_url,
                protocols_str,
                broadcast_channel_suffix,
            )
        except Exception:
            raise

    async def close_ws(
        self,
        instance_id: str,
        kernel_client_id: str,
        ws_url: str,
        broadcast_channel_suffix: Optional[str] = None,
    ):
        if self.bridge is None:
            return

        await self.bridge.close_ws(
            instance_id, kernel_client_id, ws_url, broadcast_channel_suffix
        )

    async def receive_ws_message(
        self, instance_id: str, kernel_client_id: str, ws_url: str, payload_message: str
    ):
        if self.bridge is None:
            raise Exception("Server bridge is not created")

        await self.bridge.receive_ws_message_from_js(
            instance_id, kernel_client_id, ws_url, payload_message
        )
