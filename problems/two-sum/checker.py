from __future__ import annotations

from typing import Any


def check(input_data: dict[str, Any], expected: list[int], actual: Any) -> dict[str, Any]:
    nums = input_data["nums"]
    target = input_data["target"]

    if not isinstance(actual, list) or len(actual) != 2:
        return {"passed": False, "message": "Expected a list containing exactly two indices."}

    if not all(isinstance(index, int) for index in actual):
        return {"passed": False, "message": "Both returned values must be integer indices."}

    left, right = actual
    if left == right:
        return {"passed": False, "message": "The same index cannot be used twice."}

    if left < 0 or right < 0 or left >= len(nums) or right >= len(nums):
        return {"passed": False, "message": "One or both indices are outside the input array."}

    if nums[left] + nums[right] != target:
        return {
            "passed": False,
            "message": f"nums[{left}] + nums[{right}] is {nums[left] + nums[right]}, not {target}.",
        }

    return {"passed": True, "message": ""}

