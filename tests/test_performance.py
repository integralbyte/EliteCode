from pathlib import Path

from backend.performance import analyze_submission, extract_reference_code, estimate_complexity
from backend.problem_loader import ProblemCatalog
from backend.runner import PythonJudge


ROOT = Path(__file__).resolve().parents[1]


def get_problem_and_judge():
    catalog = ProblemCatalog(ROOT / "problems")
    problem = catalog.get("two-sum")
    return problem, PythonJudge(catalog)


def test_complexity_estimator_distinguishes_bruteforce_from_reference() -> None:
    problem, _ = get_problem_and_judge()
    brute_force = """
class Solution:
    def twoSum(self, nums, target):
        for i in range(len(nums)):
            for j in range(i + 1, len(nums)):
                if nums[i] + nums[j] == target:
                    return [i, j]
"""

    reference_code = extract_reference_code(problem)
    assert reference_code

    user_estimate = estimate_complexity(brute_force)
    reference_estimate = estimate_complexity(reference_code)

    assert user_estimate.label == "O(n^2)"
    assert reference_estimate.label == "O(n)"


def test_submission_analysis_compares_against_reference_solution() -> None:
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

    cases = problem.cases[:5]
    result = judge.run(problem, code, cases)
    analysis = analyze_submission(problem, code, result, cases, judge.run)

    assert result.passed
    assert analysis.runtime is not None
    assert analysis.runtime.reference_verdict == "Accepted"
    assert analysis.user_complexity.label == "O(n)"
    assert analysis.reference_complexity is not None
    assert analysis.reference_complexity.label == "O(n)"
