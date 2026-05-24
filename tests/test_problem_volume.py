from __future__ import annotations

import subprocess
from pathlib import Path

from backend.problem_loader import ProblemCatalog


ROOT = Path(__file__).resolve().parents[1]


def test_every_problem_has_thousands_of_cases() -> None:
    catalog = ProblemCatalog()
    problems = list(catalog.problems.values())

    assert len(problems) == 150
    assert all(len(problem.cases) >= 2000 for problem in problems)
    assert sum(len(problem.cases) for problem in problems) >= 300_000


def test_problem_packs_pass_edge_coverage_audit() -> None:
    subprocess.run(["node", "scripts/audit_edge_coverage.mjs"], cwd=ROOT, check=True)
