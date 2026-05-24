from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path
from typing import Any

from .models import CaseResult, JudgeResult, Problem, ProblemCase
from .problem_loader import ProblemCatalog


RUNNER_SOURCE = r"""
import contextlib
import copy
import importlib
import io
import json
import sys
import time
import traceback
from pathlib import Path


def apply_limits(payload):
    try:
        import resource
    except Exception:
        return

    time_limit_ms = int(payload.get("time_limit_ms", 2000))
    memory_limit_mb = int(payload.get("memory_limit_mb", 256))
    cpu_seconds = max(1, int(time_limit_ms / 1000) + 1)
    try:
        resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds + 1))
    except Exception:
        pass
    try:
        bytes_limit = max(memory_limit_mb, 256) * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_AS, (bytes_limit, bytes_limit))
    except Exception:
        pass


def jsonable(value):
    try:
        json.dumps(value)
        return value
    except TypeError:
        return {"__non_json_return__": repr(value)}


def main():
    payload = json.loads(Path("payload.json").read_text(encoding="utf-8"))
    apply_limits(payload)
    cases = payload["cases"]
    entrypoint = payload["entrypoint"]
    import_stdout = io.StringIO()
    import_stderr = io.StringIO()
    try:
        with contextlib.redirect_stdout(import_stdout), contextlib.redirect_stderr(import_stderr):
            solution_module = importlib.import_module("solution")
            solution_class = getattr(solution_module, entrypoint["class_name"])
    except Exception:
        message = traceback.format_exc()
        print(json.dumps({
            "import_error": message,
            "import_stdout": import_stdout.getvalue(),
            "import_stderr": import_stderr.getvalue(),
            "results": []
        }))
        return

    results = []
    for case in cases:
        stdout = io.StringIO()
        stderr = io.StringIO()
        started = time.perf_counter()
        try:
            with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                instance = solution_class()
                method = getattr(instance, entrypoint["method_name"])
                input_data = copy.deepcopy(case["input"])
                if isinstance(input_data, dict):
                    actual = method(**input_data)
                elif isinstance(input_data, list):
                    actual = method(*input_data)
                else:
                    actual = method(input_data)
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            results.append({
                "case_id": case["id"],
                "actual": jsonable(actual),
                "stdout": stdout.getvalue(),
                "stderr": stderr.getvalue(),
                "runtime_ms": elapsed_ms,
                "error": None
            })
        except Exception:
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            results.append({
                "case_id": case["id"],
                "actual": None,
                "stdout": stdout.getvalue(),
                "stderr": stderr.getvalue(),
                "runtime_ms": elapsed_ms,
                "error": traceback.format_exc()
            })

    print(json.dumps({"results": results, "import_stdout": import_stdout.getvalue(), "import_stderr": import_stderr.getvalue()}))


if __name__ == "__main__":
    main()
"""


class PythonJudge:
    def __init__(self, catalog: ProblemCatalog) -> None:
        self.catalog = catalog

    def run(self, problem: Problem, code: str, cases: list[ProblemCase]) -> JudgeResult:
        timeout_seconds = max(1.0, problem.time_limit_ms / 1000) * max(1, len(cases)) + 1.0
        with tempfile.TemporaryDirectory(prefix="elitecode-") as temp_dir:
            temp_path = Path(temp_dir)
            (temp_path / "solution.py").write_text(code, encoding="utf-8")
            (temp_path / "runner.py").write_text(textwrap.dedent(RUNNER_SOURCE), encoding="utf-8")
            (temp_path / "payload.json").write_text(
                json.dumps(
                    {
                        "entrypoint": problem.entrypoint.model_dump(),
                        "time_limit_ms": problem.time_limit_ms,
                        "memory_limit_mb": problem.memory_limit_mb,
                        "cases": [case.model_dump() for case in cases],
                    }
                ),
                encoding="utf-8",
            )
            env = {
                "PATH": os.environ.get("PATH", ""),
                "PYTHONPATH": str(temp_path),
                "PYTHONDONTWRITEBYTECODE": "1",
            }
            try:
                proc = subprocess.run(
                    [sys.executable, "runner.py"],
                    cwd=temp_path,
                    env=env,
                    text=True,
                    capture_output=True,
                    timeout=timeout_seconds,
                )
            except subprocess.TimeoutExpired:
                return self._timeout_result(problem, cases)

        if proc.returncode < 0:
            return self._timeout_result(problem, cases)

        if proc.returncode != 0:
            return self._internal_error_result(problem, cases, proc.stderr or proc.stdout)

        try:
            payload = json.loads(proc.stdout.strip() or "{}")
        except json.JSONDecodeError:
            return self._internal_error_result(problem, cases, proc.stderr or proc.stdout)

        return self._evaluate(problem, cases, payload)

    def _evaluate(self, problem: Problem, cases: list[ProblemCase], payload: dict[str, Any]) -> JudgeResult:
        runner_results = {result.get("case_id"): result for result in payload.get("results", [])}
        case_results: list[CaseResult] = []
        checker = self.catalog.get_checker(problem)
        import_error = payload.get("import_error")
        import_stdout = payload.get("import_stdout") or ""
        import_stderr = payload.get("import_stderr") or ""

        for case in cases:
            if import_error:
                case_results.append(
                    self._case_result(
                        case,
                        status="Runtime Error",
                        passed=False,
                        actual=None,
                        stdout=import_stdout,
                        stderr=import_stderr,
                        message=import_error,
                        runtime_ms=0,
                    )
                )
                continue

            raw = runner_results.get(case.id)
            if raw is None:
                case_results.append(
                    self._case_result(
                        case,
                        status="Internal Judge Error",
                        passed=False,
                        actual=None,
                        message="The runner did not return a result for this case.",
                        runtime_ms=0,
                    )
                )
                continue

            if raw.get("error"):
                case_results.append(
                    self._case_result(
                        case,
                        status="Runtime Error",
                        passed=False,
                        actual=raw.get("actual"),
                        stdout=raw.get("stdout", ""),
                        stderr=raw.get("stderr", ""),
                        message=raw["error"],
                        runtime_ms=raw.get("runtime_ms", 0),
                    )
                )
                continue

            actual = raw.get("actual")
            if isinstance(actual, dict) and "__non_json_return__" in actual:
                case_results.append(
                    self._case_result(
                        case,
                        status="Wrong Answer",
                        passed=False,
                        actual=actual["__non_json_return__"],
                        stdout=raw.get("stdout", ""),
                        stderr=raw.get("stderr", ""),
                        message="Return value is not JSON serializable.",
                        runtime_ms=raw.get("runtime_ms", 0),
                    )
                )
                continue

            check_result = checker(case.input, case.expected, actual)
            passed, message = self._normalize_check_result(check_result)
            case_results.append(
                self._case_result(
                    case,
                    status="Accepted" if passed else "Wrong Answer",
                    passed=passed,
                    actual=actual,
                    stdout=raw.get("stdout", ""),
                    stderr=raw.get("stderr", ""),
                    message=message,
                    runtime_ms=raw.get("runtime_ms", 0),
                )
            )

        return self._summarize(problem.slug, case_results)

    def _case_result(
        self,
        case: ProblemCase,
        status: str,
        passed: bool,
        actual: Any,
        stdout: str = "",
        stderr: str = "",
        message: str = "",
        runtime_ms: int = 0,
    ) -> CaseResult:
        return CaseResult(
            case_id=case.id,
            case_name=case.name,
            status=status,
            passed=passed,
            hidden=case.hidden,
            input=None if case.hidden else case.input,
            expected=None if case.hidden else case.expected,
            actual=None if case.hidden and not passed else actual,
            stdout=stdout,
            stderr=stderr,
            message=message,
            runtime_ms=runtime_ms,
        )

    def _summarize(self, slug: str, case_results: list[CaseResult]) -> JudgeResult:
        passed_cases = sum(1 for result in case_results if result.passed)
        total_runtime = sum(result.runtime_ms for result in case_results)
        if passed_cases == len(case_results):
            verdict = "Accepted"
        else:
            first_failure = next((result for result in case_results if not result.passed), None)
            verdict = first_failure.status if first_failure else "Wrong Answer"
        return JudgeResult(
            slug=slug,
            verdict=verdict,
            passed=verdict == "Accepted",
            total_cases=len(case_results),
            passed_cases=passed_cases,
            runtime_ms=total_runtime,
            case_results=case_results,
        )

    def _timeout_result(self, problem: Problem, cases: list[ProblemCase]) -> JudgeResult:
        case_results = [
            self._case_result(
                case,
                status="Time Limit Exceeded",
                passed=False,
                actual=None,
                message=f"Execution exceeded {problem.time_limit_ms} ms per case budget.",
                runtime_ms=problem.time_limit_ms,
            )
            for case in cases
        ]
        return self._summarize(problem.slug, case_results)

    def _internal_error_result(self, problem: Problem, cases: list[ProblemCase], message: str) -> JudgeResult:
        case_results = [
            self._case_result(
                case,
                status="Internal Judge Error",
                passed=False,
                actual=None,
                stderr=message,
                message="The local judge failed before it could evaluate the submission.",
                runtime_ms=0,
            )
            for case in cases
        ]
        return self._summarize(problem.slug, case_results)

    def _normalize_check_result(self, result: Any) -> tuple[bool, str]:
        if isinstance(result, bool):
            return result, ""
        if isinstance(result, dict):
            return bool(result.get("passed")), str(result.get("message", ""))
        return bool(result), ""
