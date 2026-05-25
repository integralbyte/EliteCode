from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Any

from .models import ProgressPayload, SubmissionRecord


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = ROOT / "data" / "elitecode.sqlite3"


class Storage:
    def __init__(self, db_path: Path | None = None) -> None:
        self.db_path = Path(db_path or os.environ.get("ELITECODE_DB_PATH", DEFAULT_DB_PATH))
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.init()

    def connect(self) -> sqlite3.Connection:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        con = sqlite3.connect(self.db_path)
        con.row_factory = sqlite3.Row
        return con

    def init(self) -> None:
        with self.connect() as con:
            con.executescript(
                """
                create table if not exists progress (
                    slug text not null,
                    language text not null,
                    code text not null,
                    solved integer not null default 0,
                    settings_json text not null default '{}',
                    updated_at text not null default current_timestamp,
                    primary key (slug, language)
                );

                create table if not exists submissions (
                    id integer primary key autoincrement,
                    slug text not null,
                    language text not null,
                    code text not null,
                    verdict text not null,
                    passed integer not null,
                    runtime_ms integer not null,
                    results_json text not null,
                    created_at text not null default current_timestamp
                );

                create table if not exists settings (
                    key text primary key,
                    value_json text not null,
                    updated_at text not null default current_timestamp
                );
                """
            )

    def get_solved_slugs(self) -> set[str]:
        with self.connect() as con:
            rows = con.execute("select distinct slug from progress where solved = 1").fetchall()
        return {row["slug"] for row in rows}

    def get_setting(self, key: str, default: Any = None) -> Any:
        with self.connect() as con:
            row = con.execute("select value_json from settings where key = ?", (key,)).fetchone()
        return json.loads(row["value_json"]) if row else default

    def set_setting(self, key: str, value: Any) -> None:
        with self.connect() as con:
            con.execute(
                """
                insert into settings (key, value_json, updated_at)
                values (?, ?, current_timestamp)
                on conflict(key) do update set
                    value_json = excluded.value_json,
                    updated_at = current_timestamp
                """,
                (key, json.dumps(value)),
            )

    def get_progress(self, slug: str, language: str, fallback_code: str) -> ProgressPayload:
        with self.connect() as con:
            row = con.execute(
                """
                select slug, language, code, solved, settings_json
                from progress
                where slug = ? and language = ?
                """,
                (slug, language),
            ).fetchone()

        if row is None:
            return ProgressPayload(slug=slug, language=language, code=fallback_code, solved=False, settings={})

        return ProgressPayload(
            slug=row["slug"],
            language=row["language"],
            code=row["code"],
            solved=bool(row["solved"]),
            settings=json.loads(row["settings_json"] or "{}"),
        )

    def save_progress(
        self,
        slug: str,
        language: str,
        code: str,
        settings: dict[str, Any] | None = None,
        solved: bool | None = None,
    ) -> ProgressPayload:
        existing = self.get_progress(slug, language, code)
        solved_value = existing.solved if solved is None else solved
        settings_value = settings if settings is not None else existing.settings
        with self.connect() as con:
            con.execute(
                """
                insert into progress (slug, language, code, solved, settings_json, updated_at)
                values (?, ?, ?, ?, ?, current_timestamp)
                on conflict(slug, language) do update set
                    code = excluded.code,
                    solved = case when progress.solved = 1 then 1 else excluded.solved end,
                    settings_json = excluded.settings_json,
                    updated_at = current_timestamp
                """,
                (slug, language, code, int(solved_value), json.dumps(settings_value)),
            )
        self.set_setting("last_opened_problem", slug)
        return self.get_progress(slug, language, code)

    def create_submission(
        self,
        slug: str,
        language: str,
        code: str,
        verdict: str,
        passed: bool,
        runtime_ms: float,
        results: dict[str, Any],
    ) -> SubmissionRecord:
        with self.connect() as con:
            cur = con.execute(
                """
                insert into submissions (slug, language, code, verdict, passed, runtime_ms, results_json)
                values (?, ?, ?, ?, ?, ?, ?)
                """,
                (slug, language, code, verdict, int(passed), runtime_ms, json.dumps(results)),
            )
            submission_id = int(cur.lastrowid)
            row = con.execute("select * from submissions where id = ?", (submission_id,)).fetchone()
        return self._row_to_submission(row)

    def list_submissions(self, slug: str | None = None) -> list[SubmissionRecord]:
        sql = "select * from submissions"
        params: tuple[Any, ...] = ()
        if slug:
            sql += " where slug = ?"
            params = (slug,)
        sql += " order by id desc limit 100"
        with self.connect() as con:
            rows = con.execute(sql, params).fetchall()
        return [self._row_to_submission(row) for row in rows]

    def _row_to_submission(self, row: sqlite3.Row) -> SubmissionRecord:
        return SubmissionRecord(
            id=row["id"],
            slug=row["slug"],
            language=row["language"],
            verdict=row["verdict"],
            passed=bool(row["passed"]),
            runtime_ms=row["runtime_ms"],
            created_at=row["created_at"],
            results=json.loads(row["results_json"]),
        )
