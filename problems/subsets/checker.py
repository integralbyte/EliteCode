from __future__ import annotations

import json
from typing import Any


def normalize_combo(item: Any) -> str:
    if isinstance(item, list):
        try:
            return json.dumps(sorted(item), sort_keys=True)
        except TypeError:
            return json.dumps(item, sort_keys=True)
    return json.dumps(item, sort_keys=True)


def check(input_data: dict[str, Any], expected: Any, actual: Any) -> dict[str, Any]:
    if not isinstance(actual, list):
        return {"passed": False, "message": "Expected a list."}
    return {"passed": sorted(normalize_combo(item) for item in actual) == sorted(normalize_combo(item) for item in expected), "message": ""}
