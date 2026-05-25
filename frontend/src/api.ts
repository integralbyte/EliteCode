export type Difficulty = "Easy" | "Medium" | "Hard";
export type Language = "python";

export interface ProblemSummary {
  id: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  stats: ProblemStats;
  solved: boolean;
}

export interface ProblemStats {
  accepted: string;
  submissions: string;
  acceptance_rate: string;
}

export interface ProblemCase {
  id: string;
  name: string;
  input: unknown;
  expected: unknown;
  hidden?: boolean;
}

export interface Problem {
  id: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  companies: string[];
  stats: ProblemStats;
  statement: string;
  editorial: string;
  solution_notes: string;
  hints: string[];
  similar_questions: Array<{ title: string; difficulty: string }>;
  starter_code: Record<Language, string>;
  cases: ProblemCase[];
}

export interface Progress {
  slug: string;
  language: Language;
  code: string;
  solved: boolean;
  settings: Record<string, unknown>;
}

export interface ProblemsResponse {
  problems: ProblemSummary[];
  last_opened_slug?: string | null;
}

export interface CaseResult {
  case_id: string;
  case_name: string;
  status: string;
  passed: boolean;
  hidden: boolean;
  input: unknown | null;
  expected: unknown | null;
  actual: unknown | null;
  stdout: string;
  stderr: string;
  message: string;
  runtime_ms: number;
}

export interface JudgeResult {
  slug: string;
  verdict: string;
  passed: boolean;
  total_cases: number;
  passed_cases: number;
  runtime_ms: number;
  case_results: CaseResult[];
  analysis?: SubmissionAnalysis | null;
}

export interface ComplexityEstimate {
  label: string;
  confidence: "low" | "medium" | "high";
  reason: string;
  features: string[];
  observed_growth?: string | null;
  observed_exponent?: number | null;
}

export interface RuntimeComparison {
  user_runtime_ms: number;
  reference_runtime_ms: number;
  delta_ms: number;
  ratio?: number | null;
  relative_label: string;
  reference_verdict: string;
  reference_name: string;
}

export interface SubmissionAnalysis {
  runtime?: RuntimeComparison | null;
  user_complexity: ComplexityEstimate;
  reference_complexity?: ComplexityEstimate | null;
  notes: string[];
}

export interface SubmissionRecord {
  id: number;
  slug: string;
  language: Language;
  verdict: string;
  passed: boolean;
  runtime_ms: number;
  created_at: string;
  results: JudgeResult;
}

export interface RunPayload {
  slug: string;
  language: Language;
  code: string;
  case_ids?: string[];
  custom_cases?: ProblemCase[];
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getProblems: () => request<ProblemsResponse>("/api/problems"),
  getProblem: (slug: string) => request<Problem>(`/api/problems/${slug}`),
  getProgress: (slug: string) => request<Progress>(`/api/progress/${slug}?language=python`),
  saveProgress: (slug: string, code: string, settings: Record<string, unknown>) =>
    request<Progress>(`/api/progress/${slug}`, {
      method: "PUT",
      body: JSON.stringify({ language: "python", code, settings })
    }),
  getSubmissions: (slug: string) => request<SubmissionRecord[]>(`/api/submissions?slug=${slug}`),
  run: (payload: RunPayload) =>
    request<JudgeResult>("/api/run", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  submit: (payload: RunPayload) =>
    request<JudgeResult>("/api/submit", {
      method: "POST",
      body: JSON.stringify(payload)
    })
};
