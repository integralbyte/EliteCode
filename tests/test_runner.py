from pathlib import Path

from backend.problem_loader import ProblemCatalog
from backend.runner import PythonJudge


ROOT = Path(__file__).resolve().parents[1]


def get_problem_and_judge():
    catalog = ProblemCatalog(ROOT / "problems")
    problem = catalog.get("two-sum")
    return problem, PythonJudge(catalog)


def test_runner_accepts_correct_python_solution() -> None:
    problem, judge = get_problem_and_judge()
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

    result = judge.run(problem, code, problem.cases)

    assert result.verdict == "Accepted"
    assert result.passed_cases == len(problem.cases)


def test_runner_reports_wrong_answer() -> None:
    problem, judge = get_problem_and_judge()
    code = """
class Solution:
    def twoSum(self, nums, target):
        return [0, 0]
"""

    result = judge.run(problem, code, [problem.cases[0]])

    assert result.verdict == "Wrong Answer"
    assert result.case_results[0].message == "The same index cannot be used twice."


def test_runner_reports_runtime_error() -> None:
    problem, judge = get_problem_and_judge()
    code = """
class Solution:
    def twoSum(self, nums, target):
        raise RuntimeError("boom")
"""

    result = judge.run(problem, code, [problem.cases[0]])

    assert result.verdict == "Runtime Error"
    assert "boom" in result.case_results[0].message


def test_runner_reports_timeout() -> None:
    problem, judge = get_problem_and_judge()
    fast_timeout_problem = problem.model_copy(update={"time_limit_ms": 100})
    code = """
class Solution:
    def twoSum(self, nums, target):
        while True:
            pass
"""

    result = judge.run(fast_timeout_problem, code, [problem.cases[0]])

    assert result.verdict == "Time Limit Exceeded"

