from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
from types import ModuleType
from typing import Any, Callable

from pydantic import ValidationError

from .models import Problem


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PROBLEMS_DIR = ROOT / "problems"


class ProblemCatalog:
    def __init__(self, problems_dir: Path = DEFAULT_PROBLEMS_DIR) -> None:
        self.problems_dir = Path(problems_dir)
        self._problems: dict[str, Problem] = {}
        self._checker_modules: dict[str, ModuleType] = {}

    def load(self) -> dict[str, Problem]:
        problems: dict[str, Problem] = {}
        if not self.problems_dir.exists():
            raise FileNotFoundError(f"Problem directory does not exist: {self.problems_dir}")

        for problem_file in sorted(self.problems_dir.glob("*/problem.json")):
            raw = json.loads(problem_file.read_text(encoding="utf-8"))
            problem = Problem.model_validate(raw)
            if problem.slug in problems:
                raise ValueError(f"Duplicate problem slug: {problem.slug}")
            if problem.checker.type == "python":
                checker_path = problem_file.parent / str(problem.checker.file)
                if not checker_path.exists():
                    raise FileNotFoundError(f"Missing checker for {problem.slug}: {checker_path}")
            problems[problem.slug] = problem

        if not problems:
            raise ValueError(f"No problem.json files found in {self.problems_dir}")

        self._problems = problems
        self._checker_modules = {}
        return self._problems

    @property
    def problems(self) -> dict[str, Problem]:
        if not self._problems:
            self.load()
        return self._problems

    def list_public(self, solved_slugs: set[str] | None = None) -> list[dict[str, Any]]:
        solved_slugs = solved_slugs or set()
        return [
            {
                "id": problem.id,
                "slug": problem.slug,
                "title": problem.title,
                "difficulty": problem.difficulty,
                "tags": problem.tags,
                "stats": problem.stats.model_dump(),
                "solved": problem.slug in solved_slugs,
            }
            for problem in sorted(self.problems.values(), key=lambda item: item.id)
        ]

    def get(self, slug: str) -> Problem:
        try:
            return self.problems[slug]
        except KeyError as exc:
            raise KeyError(f"Unknown problem slug: {slug}") from exc

    def get_checker(self, problem: Problem) -> Callable[[Any, Any, Any], Any]:
        if problem.checker.type == "exact":
            return lambda input_data, expected, actual: actual == expected

        module = self._checker_modules.get(problem.slug)
        if module is None:
            checker_path = self.problems_dir / problem.slug / str(problem.checker.file)
            spec = importlib.util.spec_from_file_location(f"elitecode_checker_{problem.slug}", checker_path)
            if spec is None or spec.loader is None:
                raise RuntimeError(f"Could not load checker module: {checker_path}")
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            self._checker_modules[problem.slug] = module

        check = getattr(module, "check", None)
        if not callable(check):
            raise RuntimeError(f"Checker for {problem.slug} must expose check(input_data, expected, actual)")
        return check


def validate_problem_dir(path: Path) -> None:
    catalog = ProblemCatalog(path)
    catalog.load()
    for problem in catalog.problems.values():
        if problem.checker.type == "python":
            catalog.get_checker(problem)


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate EliteCode problem packs.")
    parser.add_argument("--validate", type=Path, default=DEFAULT_PROBLEMS_DIR, help="Problem root directory")
    args = parser.parse_args()

    try:
        validate_problem_dir(args.validate)
    except (ValidationError, ValueError, FileNotFoundError, RuntimeError) as exc:
        raise SystemExit(f"Problem validation failed: {exc}") from exc

    print(f"Validated problem packs in {args.validate}")


if __name__ == "__main__":
    main()

