import type { CaseResult, Difficulty, JudgeResult } from "./api";

export function prettyJson(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function difficultyClass(difficulty: Difficulty | string): string {
  return `difficulty difficulty-${difficulty.toLowerCase()}`;
}

export function verdictClass(verdict: string): string {
  const normalized = verdict.toLowerCase().replaceAll(" ", "-");
  return `verdict verdict-${normalized}`;
}

export function summarizeResult(result: JudgeResult | null): string {
  if (!result) {
    return "No result yet";
  }
  return `${result.verdict} · ${result.passed_cases}/${result.total_cases} cases · ${result.runtime_ms} ms`;
}

export function firstFailedCase(result: JudgeResult | null): CaseResult | null {
  return result?.case_results.find((caseResult) => !caseResult.passed) ?? null;
}

