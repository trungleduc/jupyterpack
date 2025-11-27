import json
import sys


def patch_shiny():
    sys.modules["orjson"] = json
