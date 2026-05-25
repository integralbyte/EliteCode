from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from .models import ComplexityEstimate


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST_PATH = ROOT / "problems" / "reference_complexity_manifest.json"


@lru_cache(maxsize=1)
def load_reference_complexity_manifest(path: Path = DEFAULT_MANIFEST_PATH) -> dict[str, dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    problems = payload.get("problems", {})
    if not isinstance(problems, dict):
        raise ValueError("reference complexity manifest must contain a problems object")
    return problems


def get_reference_complexity(slug: str) -> ComplexityEstimate | None:
    entry = load_reference_complexity_manifest().get(slug)
    if not entry:
        return None

    source_url = entry.get("source_url")
    features = [
        f"category: {entry.get('category', 'unknown')}",
        "curated optimal target",
    ]
    if source_url:
        features.append(f"source: {source_url}")

    return ComplexityEstimate(
        label=entry["time"],
        space_label=entry.get("space"),
        confidence="high",
        reason=(
            "Curated target for the expected Python solution, reviewed against the local "
            "reference implementation and public solution-complexity references."
        ),
        features=features,
        source_url=source_url,
        source_note=entry.get("source_note"),
    )
