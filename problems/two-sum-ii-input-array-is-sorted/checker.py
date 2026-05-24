
from __future__ import annotations

from typing import Any


def check(input_data: dict[str, Any], expected: list[int], actual: Any) -> dict[str, Any]:
    numbers = input_data["numbers"]
    target = input_data["target"]
    if not isinstance(actual, list) or len(actual) != 2 or not all(isinstance(index, int) for index in actual):
        return {"passed": False, "message": "Return two one-based indices."}
    left, right = actual
    if left == right or left < 1 or right < 1 or left > len(numbers) or right > len(numbers):
        return {"passed": False, "message": "Indices must be distinct and one-based."}
    if numbers[left - 1] + numbers[right - 1] != target:
        return {"passed": False, "message": "Selected values do not add to target."}
    return {"passed": True, "message": ""}
