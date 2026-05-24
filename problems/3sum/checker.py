
from __future__ import annotations

from typing import Any


def _normalise(value: Any) -> list[tuple[int, int, int]] | None:
    if not isinstance(value, list):
        return None
    result = []
    for triplet in value:
        if not isinstance(triplet, list) or len(triplet) != 3:
            return None
        if not all(isinstance(item, int) for item in triplet):
            return None
        result.append(tuple(sorted(triplet)))
    return sorted(set(result))


def check(input_data: dict[str, Any], expected: list[list[int]], actual: Any) -> dict[str, Any]:
    expected_norm = _normalise(expected)
    actual_norm = _normalise(actual)
    if actual_norm is None:
        return {"passed": False, "message": "Return a list of integer triplets."}
    return {"passed": actual_norm == expected_norm, "message": ""}
