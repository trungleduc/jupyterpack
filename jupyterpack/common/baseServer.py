from abc import ABC, abstractmethod
from typing import Dict, Optional
from .tools import set_base_url_env


class BaseServer(ABC):
    def __init__(self, base_url: str):
        super().__init__()
        set_base_url_env(base_url)
        self._base_url = base_url

    @property
    def base_url(self) -> str:
        return self._base_url

    @abstractmethod
    def dispose(self, *args, **kwargs) -> None:
        pass

    @abstractmethod
    def reload(self, *args, **kwargs) -> bool:
        pass

    @abstractmethod
    async def get_response(
        self,
        method: str,
        url: str,
        headers: Dict,
        content: Optional[str] = None,
        params: Optional[str] = None,
    ) -> str:
        pass
