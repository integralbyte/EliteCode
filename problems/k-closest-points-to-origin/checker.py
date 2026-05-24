from __future__ import annotations

from typing import Any


def check(input_data: dict[str, Any], expected: list[list[int]], actual: Any) -> dict[str, Any]:
    if not isinstance(actual, list):
        return {"passed": False, "message": "Expected a list of points."}
    try:
        normalize = lambda points: sorted([tuple(point) for point in points])
        return {"passed": normalize(actual) == normalize(expected), "message": ""}
    except TypeError:
        return {"passed": False, "message": "Every point must be a pair of integers."}
