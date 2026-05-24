from __future__ import annotations
from typing import Any

def check(input_data: dict[str, Any], expected: str, actual: Any) -> dict[str, Any]:
    words = input_data["words"]
    chars = set("".join(words))
    if expected == "":
        return {"passed": actual == "", "message": ""}
    if not isinstance(actual, str) or set(actual) != chars or len(actual) != len(chars):
        return {"passed": False, "message": "Expected an ordering containing each alien character once."}
    pos = {ch: i for i, ch in enumerate(actual)}
    for a, b in zip(words, words[1:]):
        if len(a) > len(b) and a.startswith(b):
            return {"passed": actual == "", "message": ""}
        for left, right in zip(a, b):
            if left != right:
                if pos[left] > pos[right]:
                    return {"passed": False, "message": "Ordering violates adjacent word precedence."}
                break
    return {"passed": True, "message": ""}
