from __future__ import annotations
from typing import Any

def check(input_data: dict[str, Any], expected: str, actual: Any) -> dict[str, Any]:
    s = input_data["s"]
    if not isinstance(actual, str):
        return {"passed": False, "message": "Expected a string."}
    ok = actual in s and actual == actual[::-1] and len(actual) == len(expected)
    return {"passed": ok, "message": ""}
