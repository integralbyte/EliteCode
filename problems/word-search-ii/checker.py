from __future__ import annotations

from typing import Any


def check(input_data: dict[str, Any], expected: list[str], actual: Any) -> dict[str, Any]:
    if not isinstance(actual, list) or not all(isinstance(item, str) for item in actual):
        return {"passed": False, "message": "Expected a list of words."}
    return {"passed": sorted(actual) == sorted(expected), "message": ""}
