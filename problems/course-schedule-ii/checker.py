from __future__ import annotations
from typing import Any

def check(input_data: dict[str, Any], expected: list[int], actual: Any) -> dict[str, Any]:
    n = input_data["numCourses"]
    prereqs = input_data["prerequisites"]
    if expected == []:
        return {"passed": actual == [], "message": ""}
    if not isinstance(actual, list) or len(actual) != n or set(actual) != set(range(n)):
        return {"passed": False, "message": "Expected a permutation of all courses."}
    pos = {course: index for index, course in enumerate(actual)}
    ok = all(pos[pre] < pos[course] for course, pre in prereqs)
    return {"passed": ok, "message": ""}
