
from __future__ import annotations

from typing import Any


def check(input_data: dict[str, Any], expected: list[int], actual: Any) -> dict[str, Any]:
    if not isinstance(actual, list) or not all(isinstance(value, int) for value in actual):
        return {"passed": False, "message": "Return a list of integers."}
    if len(actual) != input_data["k"]:
        return {"passed": False, "message": "Return exactly k values."}
    return {"passed": set(actual) == set(expected), "message": ""}
