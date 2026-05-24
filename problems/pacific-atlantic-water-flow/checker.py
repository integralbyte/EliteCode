from __future__ import annotations
from typing import Any

def check(input_data: dict[str, Any], expected: list[list[int]], actual: Any) -> dict[str, Any]:
    try:
        return {"passed": sorted(map(tuple, actual)) == sorted(map(tuple, expected)), "message": ""}
    except TypeError:
        return {"passed": False, "message": "Expected a list of coordinate pairs."}
