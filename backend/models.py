from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


Difficulty = Literal["Easy", "Medium", "Hard"]
Language = Literal["python"]


class ProblemStats(BaseModel):
    accepted: str = "0"
    submissions: str = "0"
    acceptance_rate: str = "0%"


class Entrypoint(BaseModel):
    class_name: str = "Solution"
    method_name: str


class CheckerConfig(BaseModel):
    type: Literal["exact", "python"] = "exact"
    file: str | None = None

    @field_validator("file")
    @classmethod
    def python_checker_needs_file(cls, value: str | None, info: Any) -> str | None:
        checker_type = info.data.get("type")
        if checker_type == "python" and not value:
            raise ValueError("python checkers require a file")
        return value


class ProblemCase(BaseModel):
    id: str
    name: str
    input: dict[str, Any] | list[Any] | Any
    expected: Any
    hidden: bool = False


class Problem(BaseModel):
    id: int
    slug: str
    title: str
    difficulty: Difficulty
    tags: list[str] = Field(default_factory=list)
    companies: list[str] = Field(default_factory=list)
    statement: str
    editorial: str = ""
    solution_notes: str = ""
    hints: list[str] = Field(default_factory=list)
    similar_questions: list[dict[str, str]] = Field(default_factory=list)
    stats: ProblemStats = Field(default_factory=ProblemStats)
    starter_code: dict[Language, str]
    entrypoint: Entrypoint
    checker: CheckerConfig = Field(default_factory=CheckerConfig)
    time_limit_ms: int = 2000
    memory_limit_mb: int = 256
    cases: list[ProblemCase]

    @field_validator("cases")
    @classmethod
    def must_have_case_ids(cls, cases: list[ProblemCase]) -> list[ProblemCase]:
        ids = [case.id for case in cases]
        if len(ids) != len(set(ids)):
            raise ValueError("case ids must be unique")
        if not any(not case.hidden for case in cases):
            raise ValueError("at least one visible case is required")
        return cases

    def public_payload(self) -> dict[str, Any]:
        payload = self.model_dump()
        payload["cases"] = [case.model_dump() for case in self.cases if not case.hidden]
        return payload


class ProgressPayload(BaseModel):
    slug: str
    language: Language = "python"
    code: str
    solved: bool = False
    settings: dict[str, Any] = Field(default_factory=dict)


class SaveProgressRequest(BaseModel):
    language: Language = "python"
    code: str
    settings: dict[str, Any] = Field(default_factory=dict)


class RunRequest(BaseModel):
    slug: str
    language: Language = "python"
    code: str
    case_ids: list[str] | None = None
    custom_cases: list[ProblemCase] | None = None


class CaseResult(BaseModel):
    case_id: str
    case_name: str
    status: str
    passed: bool
    hidden: bool = False
    input: Any | None = None
    expected: Any | None = None
    actual: Any | None = None
    stdout: str = ""
    stderr: str = ""
    message: str = ""
    runtime_ms: int = 0


class JudgeResult(BaseModel):
    slug: str
    verdict: str
    passed: bool
    total_cases: int
    passed_cases: int
    runtime_ms: int
    case_results: list[CaseResult]


class SubmissionRecord(BaseModel):
    id: int
    slug: str
    language: Language
    verdict: str
    passed: bool
    runtime_ms: int
    created_at: str
    results: dict[str, Any]

