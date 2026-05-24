from pathlib import Path

from backend.problem_loader import ProblemCatalog, validate_problem_dir


ROOT = Path(__file__).resolve().parents[1]


def test_problem_pack_validates() -> None:
    validate_problem_dir(ROOT / "problems")


def test_catalog_exposes_only_visible_cases() -> None:
    catalog = ProblemCatalog(ROOT / "problems")
    problem = catalog.get("two-sum")

    public_payload = problem.public_payload()

    assert problem.title == "Two Sum"
    assert len(problem.cases) == 6
    assert len(public_payload["cases"]) == 3
    assert all(not case["hidden"] for case in public_payload["cases"])

