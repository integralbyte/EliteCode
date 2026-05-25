from __future__ import annotations

import ast
import math
import re
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from .models import (
    CaseResult,
    ComplexityEstimate,
    JudgeResult,
    Problem,
    ProblemCase,
    RuntimeComparison,
    SubmissionAnalysis,
)


PYTHON_BLOCK_RE = re.compile(r"```python\n(?P<code>.*?)\n```", re.DOTALL)


def analyze_submission(
    problem: Problem,
    submitted_code: str,
    submitted_result: JudgeResult,
    cases: list[ProblemCase],
    run_reference: Callable[[Problem, str, list[ProblemCase]], JudgeResult],
) -> SubmissionAnalysis:
    reference_code = extract_reference_code(problem)
    reference_result: JudgeResult | None = None
    notes = [
        "Complexity is a conservative estimate from Python AST structure and observed case scaling, not a formal proof.",
    ]

    if reference_code:
        notes.append("Expected solution is the curated reference implementation shipped with this problem pack.")
        if submitted_result.passed:
            reference_result = run_reference(problem, reference_code, cases)
            if not reference_result.passed:
                notes.append(f"Reference benchmark unavailable because the reference returned {reference_result.verdict}.")
    else:
        notes.append("Reference solution block is missing, so runtime comparison is unavailable.")

    user_complexity = estimate_complexity(submitted_code, cases, submitted_result.case_results)
    reference_complexity = None
    if reference_code:
        reference_complexity = estimate_complexity(
            reference_code,
            cases,
            reference_result.case_results if reference_result else None,
        )

    runtime = None
    if reference_result and reference_result.passed:
        runtime = compare_runtime(submitted_result, reference_result)

    return SubmissionAnalysis(
        runtime=runtime,
        user_complexity=user_complexity,
        reference_complexity=reference_complexity,
        notes=notes,
    )


def extract_reference_code(problem: Problem) -> str | None:
    match = PYTHON_BLOCK_RE.search(problem.solution_notes)
    if not match:
        return None
    return match.group("code").strip()


def compare_runtime(submitted_result: JudgeResult, reference_result: JudgeResult) -> RuntimeComparison:
    user_runtime = submitted_result.runtime_ms
    reference_runtime = reference_result.runtime_ms
    delta = round(user_runtime - reference_runtime, 3)
    ratio = round(user_runtime / reference_runtime, 2) if reference_runtime > 0 else None

    if ratio is None:
        relative_label = "same measured millisecond bucket"
    elif ratio == 0:
        relative_label = "faster than expected within measured precision"
    elif ratio <= 0.8:
        relative_label = f"{round(1 / ratio, 2)}x faster than expected"
    elif ratio >= 1.2:
        relative_label = f"{ratio}x slower than expected"
    else:
        relative_label = "within 20% of expected"

    return RuntimeComparison(
        user_runtime_ms=user_runtime,
        reference_runtime_ms=reference_runtime,
        delta_ms=delta,
        ratio=ratio,
        relative_label=relative_label,
        reference_verdict=reference_result.verdict,
    )


def estimate_complexity(
    code: str,
    cases: list[ProblemCase] | None = None,
    case_results: list[CaseResult] | None = None,
) -> ComplexityEstimate:
    static = _estimate_static_complexity(code)
    observed = _estimate_observed_growth(cases or [], case_results or [])
    if observed:
        static.observed_growth = observed.label
        static.observed_exponent = observed.exponent
        static.features.append(f"observed scaling exponent: {observed.exponent}")
        if static.confidence == "low" and observed.confidence == "medium":
            static.confidence = "medium"
    return static


def _estimate_static_complexity(code: str) -> ComplexityEstimate:
    try:
        tree = ast.parse(code)
    except SyntaxError as exc:
        return ComplexityEstimate(
            label="Unknown",
            confidence="low",
            reason=f"Python could not be parsed: {exc.msg}.",
            features=[],
        )

    visitor = _ComplexityVisitor()
    visitor.visit(tree)
    features = visitor.features()

    if visitor.recursive_functions:
        if visitor.max_recursive_branching >= 2:
            return ComplexityEstimate(
                label="Exponential / branching recursion",
                confidence="medium",
                reason="The code uses recursive functions that call themselves more than once per activation.",
                features=features,
            )
        if visitor.max_loop_depth >= 1:
            return ComplexityEstimate(
                label=f"O(n^{visitor.max_loop_depth + 1}) recursive/iterative",
                confidence="low",
                reason="The code mixes recursion with input-dependent loops, so the exact recurrence is problem-specific.",
                features=features,
            )
        return ComplexityEstimate(
            label="O(n) recursive",
            confidence="low",
            reason="Single-branch recursion was detected without nested input-dependent loops.",
            features=features,
        )

    if visitor.max_loop_depth == 0:
        if visitor.uses_sort:
            return ComplexityEstimate(
                label="O(n log n)",
                confidence="medium",
                reason="The code sorts an input-sized collection without surrounding input-dependent loops.",
                features=features,
            )
        return ComplexityEstimate(
            label="O(1)",
            confidence="low",
            reason="No input-dependent Python loops, comprehensions, recursion, or sorting calls were detected.",
            features=features,
        )

    if visitor.max_loop_depth == 1 and visitor.uses_sort:
        return ComplexityEstimate(
            label="O(n log n)",
            confidence="medium",
            reason="A sort dominates or matches the single input-dependent loop in the visible code.",
            features=features,
        )

    if visitor.max_loop_depth <= 3:
        exponent = "" if visitor.max_loop_depth == 1 else f"^{visitor.max_loop_depth}"
        return ComplexityEstimate(
            label=f"O(n{exponent})",
            confidence="medium",
            reason=f"The deepest detected input-dependent loop nesting is {visitor.max_loop_depth}.",
            features=features,
        )

    return ComplexityEstimate(
        label=f"O(n^{visitor.max_loop_depth}+)",
        confidence="low",
        reason=f"The code contains {visitor.max_loop_depth} nested input-dependent loops; the practical bound may depend on loop ranges.",
        features=features,
    )


@dataclass
class _ComplexityVisitor(ast.NodeVisitor):
    loop_depth: int = 0
    max_loop_depth: int = 0
    uses_sort: bool = False
    comprehension_count: int = 0
    recursive_functions: set[str] = field(default_factory=set)
    recursive_call_counts: dict[str, int] = field(default_factory=dict)
    function_stack: list[str] = field(default_factory=list)

    @property
    def max_recursive_branching(self) -> int:
        return max(self.recursive_call_counts.values(), default=0)

    def visit_For(self, node: ast.For) -> Any:
        self._visit_loop(node)

    def visit_AsyncFor(self, node: ast.AsyncFor) -> Any:
        self._visit_loop(node)

    def visit_While(self, node: ast.While) -> Any:
        self._visit_loop(node)

    def _visit_loop(self, node: ast.AST) -> None:
        self.loop_depth += 1
        self.max_loop_depth = max(self.max_loop_depth, self.loop_depth)
        self.generic_visit(node)
        self.loop_depth -= 1

    def visit_ListComp(self, node: ast.ListComp) -> Any:
        self._visit_comprehension(node)

    def visit_SetComp(self, node: ast.SetComp) -> Any:
        self._visit_comprehension(node)

    def visit_DictComp(self, node: ast.DictComp) -> Any:
        self._visit_comprehension(node)

    def visit_GeneratorExp(self, node: ast.GeneratorExp) -> Any:
        self._visit_comprehension(node)

    def _visit_comprehension(self, node: ast.ListComp | ast.SetComp | ast.DictComp | ast.GeneratorExp) -> None:
        self.comprehension_count += 1
        self.max_loop_depth = max(self.max_loop_depth, self.loop_depth + len(node.generators))
        self.generic_visit(node)

    def visit_FunctionDef(self, node: ast.FunctionDef) -> Any:
        self.function_stack.append(node.name)
        before = self.recursive_call_counts.get(node.name, 0)
        self.generic_visit(node)
        after = self.recursive_call_counts.get(node.name, 0)
        if after > before:
            self.recursive_functions.add(node.name)
        self.function_stack.pop()

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> Any:
        self.visit_FunctionDef(node)

    def visit_Call(self, node: ast.Call) -> Any:
        name = _call_name(node.func)
        if name in {"sorted", "list.sort", "sort"} or name.endswith(".sort"):
            self.uses_sort = True
        if self.function_stack:
            current = self.function_stack[-1]
            if name == current or name == f"self.{current}":
                self.recursive_call_counts[current] = self.recursive_call_counts.get(current, 0) + 1
        self.generic_visit(node)

    def features(self) -> list[str]:
        features = [f"max loop nesting: {self.max_loop_depth}"]
        if self.comprehension_count:
            features.append(f"comprehensions: {self.comprehension_count}")
        if self.uses_sort:
            features.append("sort call detected")
        if self.recursive_functions:
            features.append(f"recursive functions: {', '.join(sorted(self.recursive_functions))}")
        return features


def _call_name(node: ast.AST) -> str:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        base = _call_name(node.value)
        return f"{base}.{node.attr}" if base else node.attr
    return ""


@dataclass
class _ObservedGrowth:
    label: str
    exponent: float
    confidence: str


def _estimate_observed_growth(cases: list[ProblemCase], case_results: list[CaseResult]) -> _ObservedGrowth | None:
    by_id = {result.case_id: result for result in case_results}
    samples: list[tuple[float, float]] = []
    for case in cases:
        result = by_id.get(case.id)
        if not result or result.runtime_ms <= 0:
            continue
        size = _input_size(case.input)
        if size > 1:
            samples.append((float(size), float(result.runtime_ms)))

    if len(samples) < 5:
        return None

    min_size = min(size for size, _ in samples)
    max_size = max(size for size, _ in samples)
    if max_size / min_size < 3:
        return None

    xs = [math.log(size) for size, _ in samples]
    ys = [math.log(runtime) for _, runtime in samples]
    x_mean = sum(xs) / len(xs)
    y_mean = sum(ys) / len(ys)
    denominator = sum((x - x_mean) ** 2 for x in xs)
    if denominator == 0:
        return None
    slope = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, ys)) / denominator
    exponent = round(max(0.0, slope), 2)

    if exponent < 0.35:
        label = "observed near-constant"
    elif exponent < 1.35:
        label = "observed near-linear"
    elif exponent < 1.8:
        label = "observed between linear and quadratic"
    elif exponent < 2.6:
        label = "observed near-quadratic"
    else:
        label = "observed high-polynomial or worse"

    return _ObservedGrowth(label=label, exponent=exponent, confidence="medium")


def _input_size(value: Any, key: str | None = None) -> int:
    if isinstance(value, dict):
        return max(1, sum(_input_size(item, item_key) for item_key, item in value.items()))
    if isinstance(value, (list, tuple, set)):
        if not value:
            return 1
        nested = sum(_input_size(item) for item in value)
        return max(len(value), nested)
    if isinstance(value, str):
        return max(1, len(value))
    if isinstance(value, (int, float)):
        if key in {"n", "m", "rows", "cols", "amount", "capacity", "k"}:
            return max(1, int(abs(value)))
        return 1
    return 1
