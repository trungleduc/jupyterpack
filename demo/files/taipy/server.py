import queue
from taipy.gui import Gui
import taipy.gui.builder as tgb
from taipy.gui._default_config import default_config
from math import cos, exp
import os


import inspect
from engineio.async_drivers.threading import _async
import asyncio

base_url = os.getenv("JUPYTERPACK_BASE_URL")

default_config["base_url"] = base_url
default_config["client_url"] = base_url
default_config["server_config"] = {"socketio": {"async_handlers": False}}

value = 10
print(f"####www#### {base_url}, {default_config}")


def compute_data(decay: int) -> list:
    return [cos(i / 6) * exp(-i * decay / 600) for i in range(100)]


def slider_moved(state):
    state.data = compute_data(state.value)


with tgb.Page() as page:
    tgb.text(value="# Taipy Getting Started", mode="md")
    tgb.text(value="Value: {value}")
    tgb.slider(value="{value}", on_change=slider_moved)
    tgb.chart(data="{data}")

data = compute_data(value)


gui = Gui(page=page)
gui._config.config["base_url"] = base_url
gui._config.config["client_url"] = base_url
gui._config.config["server_config"] = {"socketio": {"async_handlers": False}}
print(f"######## {gui._config.config}")


class MockTask:
    def __init__(self, target=None, args=(), kwargs=None):
        kwargs = kwargs or {}
        self._target = target
        self._args = args
        self._kwargs = kwargs
        self._task = None

    def start(self):
        # wrap sync functions in a coroutine
        if inspect.iscoroutinefunction(self._target):
            coro = self._target(*self._args, **self._kwargs)
        else:

            async def coro_wrapper():
                self._target(*self._args, **self._kwargs)

            coro = coro_wrapper()
        self._task = asyncio.create_task(coro)

    def join(self):
        return self._task


class MockQueue:
    def __init__(self):
        self._q = asyncio.Queue()
        self._unfinished = 0

    def put(self, item, block=True, timeout=None):
        self._unfinished += 1
        asyncio.create_task(self._q.put(item))

    def get(self, block=True, timeout=None):
        """Mimic blocking get for threading-mode Engine.IO."""
        loop = asyncio.get_event_loop()
        try:
            # run coroutine synchronously-ish
            return loop.run_until_complete(
                self._q.get()
                if timeout is None
                else asyncio.wait_for(self._q.get(), timeout)
            )
        except asyncio.TimeoutError:
            raise queue.Empty

    def task_done(self):
        """Mimic threading.Queue.task_done."""
        if self._unfinished > 0:
            self._unfinished -= 1
            try:
                self._q.task_done()
            except Exception:
                pass

    @property
    def empty(self):
        return self._q.empty()


class MockEvent:
    def __init__(self):
        self._event = asyncio.Event()

    def set(self):
        self._event.set()

    def clear(self):
        self._event.clear()

    def is_set(self):
        return self._event.is_set()

    def wait(self, timeout=None):
        """
        Mimic threading.Event.wait(timeout).
        Returns True if the event was set, False if timeout occurred.
        """

        async def _wait():
            try:
                if timeout is None:
                    await self._event.wait()
                    return True
                else:
                    await asyncio.wait_for(self._event.wait(), timeout)
                    return True
            except asyncio.TimeoutError:
                return False

        # schedule coroutine and block-ish for Engine.IO
        task = asyncio.create_task(_wait())
        return task  # Engine.IO may need to await this


_async["thread"] = MockTask
_async["queue"] = MockQueue
_async["queue_empty"] = asyncio.QueueEmpty
_async["event"] = MockEvent
_async["time.sleep"] = asyncio.sleep

app = gui.run(
    title="Dynamic chart",
    run_server=False,
    async_mode="threading",
    base_url=base_url,
    client_url=base_url,
    server_config={"socketio": {"async_handlers": False, "allow_upgrades": False}},
)
