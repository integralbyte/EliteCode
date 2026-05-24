from __future__ import annotations

import json
from typing import Any


def check(input_data: dict[str, Any], expected: Any, actual: Any) -> dict[str, Any]:
    if not isinstance(actual, list):
        return {"passed": False, "message": "Expected a list."}
    normalize = lambda items: sorted(json.dumps(item, sort_keys=True) for item in items)
    return {"passed": normalize(actual) == normalize(expected), "message": ""}
