from __future__ import annotations
from typing import Any

def check(input_data: dict[str, Any], expected: float, actual: Any) -> dict[str, Any]:
    if not isinstance(actual, (int, float)):
        return {"passed": False, "message": "Expected a numeric result."}
    expected_value = float(expected)
    actual_value = float(actual)
    tolerance = 1e-7 * max(1.0, abs(expected_value))
    return {"passed": abs(actual_value - expected_value) <= tolerance, "message": ""}
