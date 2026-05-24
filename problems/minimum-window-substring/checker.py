
from __future__ import annotations

from collections import Counter
from typing import Any


def check(input_data: dict[str, Any], expected: str, actual: Any) -> dict[str, Any]:
    if not isinstance(actual, str):
        return {"passed": False, "message": "Return a string."}
    if expected == "":
        return {"passed": actual == "", "message": ""}
    if len(actual) != len(expected) or actual not in input_data["s"]:
        return {"passed": False, "message": "Window has the wrong length or is not a substring."}
    need = Counter(input_data["t"])
    have = Counter(actual)
    ok = all(have[ch] >= count for ch, count in need.items())
    return {"passed": ok, "message": ""}
