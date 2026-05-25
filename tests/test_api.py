import os
import tempfile

os.environ["ELITECODE_DB_PATH"] = tempfile.NamedTemporaryFile(prefix="elitecode-test-", suffix=".sqlite3").name

from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)


def test_problem_api_returns_catalog() -> None:
    response = client.get("/api/problems")

    assert response.status_code == 200
    payload = response.json()
    slugs = [problem["slug"] for problem in payload["problems"]]
    assert payload["problems"][0]["slug"] == "contains-duplicate"
    assert "two-sum" in slugs
    assert len(slugs) >= 9


def test_progress_roundtrip() -> None:
    code = "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]\n"

    put_response = client.put(
        "/api/progress/two-sum",
        json={"language": "python", "code": code, "settings": {"fontSize": 16}},
    )
    get_response = client.get("/api/progress/two-sum?language=python")

    assert put_response.status_code == 200
    assert get_response.status_code == 200
    assert get_response.json()["code"] == code
    assert get_response.json()["settings"]["fontSize"] == 16


def test_run_api_executes_visible_case() -> None:
    code = """
class Solution:
    def twoSum(self, nums, target):
        seen = {}
        for index, value in enumerate(nums):
            need = target - value
            if need in seen:
                return [seen[need], index]
            seen[value] = index
"""

    response = client.post(
        "/api/run",
        json={"slug": "two-sum", "language": "python", "code": code, "case_ids": ["case-1"]},
    )

    assert response.status_code == 200
    assert response.json()["verdict"] == "Accepted"


def test_submit_api_returns_performance_analysis() -> None:
    code = """
class Solution:
    def twoSum(self, nums, target):
        seen = {}
        for index, value in enumerate(nums):
            need = target - value
            if need in seen:
                return [seen[need], index]
            seen[value] = index
"""

    response = client.post(
        "/api/submit",
        json={"slug": "two-sum", "language": "python", "code": code},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["verdict"] == "Accepted"
    assert payload["analysis"]["runtime"]["reference_verdict"] == "Accepted"
    assert payload["analysis"]["user_complexity"]["label"] == "O(n)"
    assert payload["analysis"]["reference_complexity"]["label"] == "O(n)"


def test_problem_asset_route_serves_local_images() -> None:
    response = client.get("/api/problem-assets/valid-sudoku/original-1.png")

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.content.startswith(b"\x89PNG\r\n\x1a\n")


def test_problem_asset_route_rejects_traversal() -> None:
    response = client.get("/api/problem-assets/valid-sudoku/%2E%2E/problem.json")

    assert response.status_code == 404
