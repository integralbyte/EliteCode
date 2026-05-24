from __future__ import annotations

from backend.problem_loader import ProblemCatalog


def test_every_problem_has_thousands_of_cases() -> None:
    catalog = ProblemCatalog()
    problems = list(catalog.problems.values())

    assert len(problems) == 150
    assert all(len(problem.cases) >= 2000 for problem in problems)
    assert sum(len(problem.cases) for problem in problems) >= 300_000
