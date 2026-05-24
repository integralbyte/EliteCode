from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .models import JudgeResult, ProblemCase, RunRequest, SaveProgressRequest
from .problem_loader import DEFAULT_PROBLEMS_DIR, ProblemCatalog
from .runner import PythonJudge
from .storage import Storage


ROOT = Path(__file__).resolve().parents[1]
DIST_DIR = ROOT / "dist"

catalog = ProblemCatalog(DEFAULT_PROBLEMS_DIR)
storage = Storage()
judge = PythonJudge(catalog)


@asynccontextmanager
async def lifespan(_: FastAPI):
    catalog.load()
    yield


app = FastAPI(title="EliteCode", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/problems")
def list_problems() -> dict[str, Any]:
    return {
        "problems": catalog.list_public(storage.get_solved_slugs()),
        "last_opened_slug": storage.get_setting("last_opened_problem"),
    }


@app.get("/api/problems/{slug}")
def get_problem(slug: str) -> dict[str, Any]:
    try:
        return catalog.get(slug).public_payload()
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/problems/reload")
def reload_problems() -> dict[str, Any]:
    catalog.load()
    return {"ok": True, "count": len(catalog.problems)}


@app.get("/api/progress/{slug}")
def get_progress(slug: str, language: str = Query("python")) -> dict[str, Any]:
    try:
        problem = catalog.get(slug)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    code = problem.starter_code.get(language, "")
    return storage.get_progress(slug, language, code).model_dump()


@app.put("/api/progress/{slug}")
def save_progress(slug: str, request: SaveProgressRequest) -> dict[str, Any]:
    try:
        catalog.get(slug)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return storage.save_progress(slug, request.language, request.code, request.settings).model_dump()


@app.get("/api/submissions")
def list_submissions(slug: str | None = None) -> list[dict[str, Any]]:
    return [record.model_dump() for record in storage.list_submissions(slug)]


@app.post("/api/run")
def run_code(request: RunRequest) -> dict[str, Any]:
    problem, cases = _resolve_cases(request, submit=False)
    return judge.run(problem, request.code, cases).model_dump()


@app.post("/api/submit")
def submit_code(request: RunRequest) -> dict[str, Any]:
    problem, cases = _resolve_cases(request, submit=True)
    result = judge.run(problem, request.code, cases)
    storage.save_progress(
        problem.slug,
        request.language,
        request.code,
        settings=None,
        solved=True if result.passed else None,
    )
    storage.create_submission(
        problem.slug,
        request.language,
        request.code,
        result.verdict,
        result.passed,
        result.runtime_ms,
        result.model_dump(),
    )
    return result.model_dump()


def _resolve_cases(request: RunRequest, submit: bool) -> tuple[Any, list[ProblemCase]]:
    try:
        problem = catalog.get(request.slug)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    if request.language != "python":
        raise HTTPException(status_code=400, detail="Only Python is supported in v1.")

    if request.custom_cases:
        return problem, request.custom_cases

    available = problem.cases if submit else [case for case in problem.cases if not case.hidden]
    if request.case_ids:
        wanted = set(request.case_ids)
        available = [case for case in available if case.id in wanted]
    if not available:
        raise HTTPException(status_code=400, detail="No matching test cases.")
    return problem, available


if DIST_DIR.exists():
    assets_dir = DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{path:path}")
    def serve_spa(path: str) -> FileResponse:
        target = DIST_DIR / path
        if target.exists() and target.is_file():
            return FileResponse(target)
        return FileResponse(DIST_DIR / "index.html")
