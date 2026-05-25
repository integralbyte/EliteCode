export type Difficulty = "Easy" | "Medium" | "Hard";
export type Language = "python";
export type ExecutionRuntime = "python" | "pyscript";

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
  entrypoint: {
    class_name: string;
    method_name: string;
  };
  time_limit_ms?: number;
  memory_limit_mb?: number;
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
  space_label?: string | null;
  confidence: "low" | "medium" | "high";
  reason: string;
  features: string[];
  observed_growth?: string | null;
  observed_exponent?: number | null;
  source_url?: string | null;
  source_note?: string | null;
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

async function withStaticFallback<T>(requestPromise: Promise<T>, fallback: () => Promise<T> | T): Promise<T> {
  try {
    return await requestPromise;
  } catch {
    return fallback();
  }
}

const LOCAL_PROGRESS_PREFIX = "elitecode:progress:";
const LOCAL_SUBMISSIONS_PREFIX = "elitecode:submissions:";

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Static fallback persistence is best effort.
  }
}

async function getStaticProblems(): Promise<ProblemsResponse> {
  const payload = await request<ProblemsResponse>("/problem-data/index.json");
  const solved = new Set(
    payload.problems
      .filter((problem) => readLocalJson<Progress | null>(`${LOCAL_PROGRESS_PREFIX}${problem.slug}`, null)?.solved)
      .map((problem) => problem.slug)
  );
  return {
    ...payload,
    problems: payload.problems.map((problem) => ({ ...problem, solved: solved.has(problem.slug) }))
  };
}

async function getStaticProblem(slug: string): Promise<Problem> {
  return request<Problem>(`/problem-data/${slug}.json`);
}

function getLocalProgress(slug: string): Progress {
  return readLocalJson<Progress>(`${LOCAL_PROGRESS_PREFIX}${slug}`, {
    slug,
    language: "python",
    code: "",
    solved: false,
    settings: {}
  });
}

function saveLocalProgress(slug: string, code: string, settings: Record<string, unknown>): Progress {
  const current = getLocalProgress(slug);
  const progress = { ...current, code, settings };
  writeLocalJson(`${LOCAL_PROGRESS_PREFIX}${slug}`, progress);
  return progress;
}

function getLocalSubmissions(slug: string): SubmissionRecord[] {
  return readLocalJson<SubmissionRecord[]>(`${LOCAL_SUBMISSIONS_PREFIX}${slug}`, []);
}

function saveLocalSubmission(record: SubmissionRecord): SubmissionRecord[] {
  const submissions = [record, ...getLocalSubmissions(record.slug)];
  writeLocalJson(`${LOCAL_SUBMISSIONS_PREFIX}${record.slug}`, submissions);
  return submissions;
}

function markLocalSolved(slug: string, code: string, settings: Record<string, unknown>): Progress {
  const progress = { ...getLocalProgress(slug), code, settings, solved: true };
  writeLocalJson(`${LOCAL_PROGRESS_PREFIX}${slug}`, progress);
  return progress;
}

export const api = {
  getProblems: () => withStaticFallback(request<ProblemsResponse>("/api/problems"), getStaticProblems),
  getProblem: (slug: string) => withStaticFallback(request<Problem>(`/api/problems/${slug}`), () => getStaticProblem(slug)),
  getProgress: (slug: string) => withStaticFallback(request<Progress>(`/api/progress/${slug}?language=python`), () => getLocalProgress(slug)),
  saveProgress: (slug: string, code: string, settings: Record<string, unknown>) =>
    withStaticFallback(
      request<Progress>(`/api/progress/${slug}`, {
        method: "PUT",
        body: JSON.stringify({ language: "python", code, settings })
      }),
      () => saveLocalProgress(slug, code, settings)
    ),
  getSubmissions: (slug: string) => withStaticFallback(request<SubmissionRecord[]>(`/api/submissions?slug=${slug}`), () => getLocalSubmissions(slug)),
  saveBrowserSubmission: saveLocalSubmission,
  markBrowserSolved: markLocalSolved,
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
