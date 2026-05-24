from __future__ import annotations
from typing import Any

def check(input_data: dict[str, Any], expected: float, actual: Any) -> dict[str, Any]:
    return {"passed": isinstance(actual, (int, float)) and abs(float(actual) - float(expected)) <= 1e-7, "message": ""}
