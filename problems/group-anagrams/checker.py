
from __future__ import annotations

from typing import Any


def _normalise(groups: Any) -> list[list[str]] | None:
    if not isinstance(groups, list):
        return None
    normalised: list[list[str]] = []
    for group in groups:
        if not isinstance(group, list) or not all(isinstance(item, str) for item in group):
            return None
        normalised.append(sorted(group))
    return sorted(normalised)


def check(input_data: dict[str, Any], expected: list[list[str]], actual: Any) -> dict[str, Any]:
    expected_norm = _normalise(expected)
    actual_norm = _normalise(actual)
    if actual_norm is None:
        return {"passed": False, "message": "Return a list of string groups."}
    return {"passed": actual_norm == expected_norm, "message": ""}
