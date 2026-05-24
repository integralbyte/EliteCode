from __future__ import annotations

import re

from backend.problem_loader import ProblemCatalog
from backend.runner import PythonJudge


PYTHON_BLOCK_RE = re.compile(r"```python\n(?P<code>.*?)\n```", re.DOTALL)


def test_reference_solutions_pass_all_cases() -> None:
    catalog = ProblemCatalog()
    judge = PythonJudge(catalog)

    for problem in catalog.problems.values():
        match = PYTHON_BLOCK_RE.search(problem.solution_notes)
        assert match, f"{problem.slug} is missing a Python reference solution"

        result = judge.run(problem, match.group("code"), problem.cases)
        assert result.passed, f"{problem.slug} failed reference solution: {result.verdict}"
