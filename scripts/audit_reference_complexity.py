from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.performance import estimate_complexity, extract_reference_code
from backend.problem_loader import DEFAULT_PROBLEMS_DIR, ProblemCatalog
from backend.reference_complexity import get_reference_complexity, load_reference_complexity_manifest
from backend.runner import PythonJudge


DEFAULT_REPORT_PATH = ROOT / "reports" / "reference_complexity_report.json"


def run_audit(problems_dir: Path) -> dict[str, Any]:
    catalog = ProblemCatalog(problems_dir)
    judge = PythonJudge(catalog)
    manifest = load_reference_complexity_manifest()
    rows: list[dict[str, Any]] = []

    for problem in sorted(catalog.problems.values(), key=lambda item: item.id):
        reference_code = extract_reference_code(problem)
        expected_complexity = get_reference_complexity(problem.slug)
        if reference_code is None:
            rows.append(
                {
                    "id": problem.id,
                    "slug": problem.slug,
                    "title": problem.title,
                    "status": "missing-reference",
                    "verdict": "Missing Reference",
                    "passed": False,
                    "runtime_ms": 0,
                    "expected_complexity": expected_complexity.model_dump() if expected_complexity else None,
                    "static_complexity": None,
                }
            )
            continue

        result = judge.run(problem, reference_code, problem.cases)
        static_complexity = estimate_complexity(reference_code, problem.cases, result.case_results)
        rows.append(
            {
                "id": problem.id,
                "slug": problem.slug,
                "title": problem.title,
                "status": "ok" if result.passed else "failed-reference",
                "verdict": result.verdict,
                "passed": result.passed,
                "runtime_ms": result.runtime_ms,
                "passed_cases": result.passed_cases,
                "total_cases": result.total_cases,
                "expected_complexity": expected_complexity.model_dump() if expected_complexity else None,
                "static_complexity": static_complexity.model_dump(),
            }
        )

    failures = [
        row
        for row in rows
        if not row["passed"]
        or row["expected_complexity"] is None
    ]
    manifest_extra = sorted(set(manifest) - {problem.slug for problem in catalog.problems.values()})
    manifest_missing = sorted({problem.slug for problem in catalog.problems.values()} - set(manifest))

    return {
        "problem_count": len(rows),
        "passed_references": sum(1 for row in rows if row["passed"]),
        "manifest_count": len(manifest),
        "manifest_missing": manifest_missing,
        "manifest_extra": manifest_extra,
        "verified_expected_complexities": sum(1 for row in rows if row["expected_complexity"]),
        "failed_count": len(failures),
        "failures": [
            {
                "id": row["id"],
                "slug": row["slug"],
                "status": row["status"],
                "verdict": row["verdict"],
                "expected_complexity": row["expected_complexity"],
                "static_complexity": row["static_complexity"],
            }
            for row in failures
        ],
        "rows": rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run every expected solution and report curated/reference complexity.")
    parser.add_argument("--problems", type=Path, default=DEFAULT_PROBLEMS_DIR)
    parser.add_argument("--write", type=Path, default=None, help="Optional JSON report path.")
    parser.add_argument("--strict", action="store_true", help="Fail if any reference fails or manifest coverage is incomplete.")
    args = parser.parse_args()

    report = run_audit(args.problems)
    print(f"Problems: {report['problem_count']}")
    print(f"Expected solutions passed: {report['passed_references']}")
    print(f"Expected complexity manifest entries: {report['manifest_count']}")
    print(f"Verified expected complexities: {report['verified_expected_complexities']}")
    print(f"Reference failures or missing expected complexity: {report['failed_count']}")

    by_label: dict[str, int] = {}
    for row in report["rows"]:
        label = row["expected_complexity"]["label"] if row["expected_complexity"] else "Missing"
        by_label[label] = by_label.get(label, 0) + 1
    for label, count in sorted(by_label.items(), key=lambda item: (-item[1], item[0])):
        print(f"{count:3}  {label}")

    if report["manifest_missing"]:
        print(f"Missing manifest entries: {', '.join(report['manifest_missing'])}")
    if report["manifest_extra"]:
        print(f"Extra manifest entries: {', '.join(report['manifest_extra'])}")

    if args.write:
        args.write.parent.mkdir(parents=True, exist_ok=True)
        args.write.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote {args.write}")

    if args.strict and (report["failures"] or report["manifest_missing"] or report["manifest_extra"]):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
