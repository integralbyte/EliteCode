import type { CaseResult, JudgeResult, Problem, ProblemCase } from "./api";

interface WorkerRunnerResult {
  case_id: string;
  actual: unknown;
  stdout: string;
  stderr: string;
  runtime_ms: number;
  error: string | null;
}

interface WorkerPayload {
  import_error?: string;
  import_stdout?: string;
  import_stderr?: string;
  results?: WorkerRunnerResult[];
}

let worker: Worker | null = null;
let requestId = 0;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(`${import.meta.env.BASE_URL}pyscript-runner.worker.js`);
  }
  return worker;
}

function resetWorker() {
  worker?.terminate();
  worker = null;
}

export async function runWithPyScript(problem: Problem, code: string, cases: ProblemCase[]): Promise<JudgeResult> {
  const id = ++requestId;
  const activeWorker = getWorker();
  const timeoutMs = Math.max(30000, (problem.time_limit_ms ?? 2000) * Math.max(1, cases.length) + 15000);

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      resetWorker();
      resolve(timeoutResult(problem, cases));
    }, timeoutMs);

    const onMessage = (event: MessageEvent) => {
      if (event.data?.id !== id) {
        return;
      }
      window.clearTimeout(timeout);
      activeWorker.removeEventListener("message", onMessage);
      if (!event.data.ok) {
        resolve(internalErrorResult(problem, cases, event.data.error || "PyScript worker failed."));
        return;
      }
      resolve(evaluateWorkerPayload(problem, cases, event.data.payload as WorkerPayload));
    };

    activeWorker.addEventListener("message", onMessage);
    activeWorker.postMessage({
      id,
      code,
      payload: {
        entrypoint: problem.entrypoint,
        time_limit_ms: problem.time_limit_ms ?? 2000,
        memory_limit_mb: problem.memory_limit_mb ?? 256,
        cases
      }
    });
  });
}

function evaluateWorkerPayload(problem: Problem, cases: ProblemCase[], payload: WorkerPayload): JudgeResult {
  const rawResults = new Map((payload.results ?? []).map((result) => [result.case_id, result]));
  const caseResults = cases.map((testCase) => {
    if (payload.import_error) {
      return makeCaseResult(testCase, "Runtime Error", false, null, {
        stdout: payload.import_stdout ?? "",
        stderr: payload.import_stderr ?? "",
        message: payload.import_error,
        runtime_ms: 0
      });
    }

    const raw = rawResults.get(testCase.id);
    if (!raw) {
      return makeCaseResult(testCase, "Internal Judge Error", false, null, {
        message: "The PyScript runner did not return a result for this case."
      });
    }

    if (raw.error) {
      return makeCaseResult(testCase, "Runtime Error", false, raw.actual, {
        stdout: raw.stdout,
        stderr: raw.stderr,
        message: raw.error,
        runtime_ms: raw.runtime_ms
      });
    }

    const check = checkAnswer(problem.slug, testCase.input, testCase.expected, raw.actual);
    return makeCaseResult(testCase, check.passed ? "Accepted" : "Wrong Answer", check.passed, raw.actual, {
      stdout: raw.stdout,
      stderr: raw.stderr,
      message: check.message,
      runtime_ms: raw.runtime_ms
    });
  });

  return summarize(problem.slug, caseResults);
}

function makeCaseResult(
  testCase: ProblemCase,
  status: string,
  passed: boolean,
  actual: unknown,
  options: Partial<Pick<CaseResult, "stdout" | "stderr" | "message" | "runtime_ms">> = {}
): CaseResult {
  return {
    case_id: testCase.id,
    case_name: testCase.name,
    status,
    passed,
    hidden: Boolean(testCase.hidden),
    input: testCase.hidden ? null : testCase.input,
    expected: testCase.hidden ? null : testCase.expected,
    actual: testCase.hidden && !passed ? null : actual,
    stdout: options.stdout ?? "",
    stderr: options.stderr ?? "",
    message: options.message ?? "",
    runtime_ms: options.runtime_ms ?? 0
  };
}

function summarize(slug: string, caseResults: CaseResult[]): JudgeResult {
  const passedCases = caseResults.filter((result) => result.passed).length;
  const firstFailure = caseResults.find((result) => !result.passed);
  const verdict = passedCases === caseResults.length ? "Accepted" : firstFailure?.status ?? "Wrong Answer";
  return {
    slug,
    verdict,
    passed: verdict === "Accepted",
    total_cases: caseResults.length,
    passed_cases: passedCases,
    runtime_ms: Number(caseResults.reduce((total, result) => total + result.runtime_ms, 0).toFixed(3)),
    case_results: caseResults
  };
}

function timeoutResult(problem: Problem, cases: ProblemCase[]): JudgeResult {
  return summarize(
    problem.slug,
    cases.map((testCase) =>
      makeCaseResult(testCase, "Time Limit Exceeded", false, null, {
        message: "PyScript execution timed out and the browser worker was restarted.",
        runtime_ms: problem.time_limit_ms ?? 2000
      })
    )
  );
}

function internalErrorResult(problem: Problem, cases: ProblemCase[], message: string): JudgeResult {
  return summarize(
    problem.slug,
    cases.map((testCase) =>
      makeCaseResult(testCase, "Internal Judge Error", false, null, {
        stderr: message,
        message: "The browser Python runner failed before it could evaluate the submission."
      })
    )
  );
}

function checkAnswer(slug: string, input: unknown, expected: unknown, actual: unknown): { passed: boolean; message: string } {
  switch (slug) {
    case "two-sum":
      return checkTwoSum(input, actual);
    case "two-sum-ii-input-array-is-sorted":
      return checkTwoSumSorted(input, actual);
    case "3sum":
      return { passed: normalizeTriplets(actual) === normalizeTriplets(expected), message: normalizeTriplets(actual) ? "" : "Return a list of integer triplets." };
    case "group-anagrams":
      return { passed: normalizeGroups(actual) === normalizeGroups(expected), message: normalizeGroups(actual) ? "" : "Return a list of string groups." };
    case "top-k-frequent-elements":
      return checkSetWithLength(input, expected, actual, "k");
    case "k-closest-points-to-origin":
    case "pacific-atlantic-water-flow":
      return { passed: normalizeListOfLists(actual) === normalizeListOfLists(expected), message: "Expected a list of coordinate pairs." };
    case "generate-parentheses":
    case "word-search-ii":
      return { passed: sortedKey(actual) === sortedKey(expected), message: "Return the expected strings." };
    case "combination-sum":
    case "combination-sum-ii":
    case "subsets":
    case "subsets-ii":
      return { passed: normalizeComboList(actual) === normalizeComboList(expected), message: "Expected a list of combinations." };
    case "letter-combinations-of-a-phone-number":
    case "n-queens":
    case "palindrome-partitioning":
    case "permutations":
      return { passed: sortedKey(actual) === sortedKey(expected), message: "Expected the same set of results." };
    case "longest-palindromic-substring":
      return checkLongestPalindrome(input, expected, actual);
    case "minimum-window-substring":
      return checkMinimumWindow(input, expected, actual);
    case "powx-n":
      return checkApproxNumber(expected, actual);
    case "course-schedule-ii":
      return checkCourseScheduleOrder(input, expected, actual);
    case "alien-dictionary":
      return checkAlienOrder(input, expected, actual);
    default:
      return { passed: deepEqual(actual, expected), message: deepEqual(actual, expected) ? "" : "Actual output does not match expected output." };
  }
}

function checkTwoSum(input: unknown, actual: unknown) {
  const data = input as { nums?: number[]; target?: number };
  if (!Array.isArray(actual) || actual.length !== 2 || !actual.every(Number.isInteger)) {
    return { passed: false, message: "Expected a list containing exactly two integer indices." };
  }
  const [left, right] = actual as number[];
  const nums = data.nums ?? [];
  const target = data.target;
  const passed = left !== right && left >= 0 && right >= 0 && left < nums.length && right < nums.length && nums[left] + nums[right] === target;
  return { passed, message: passed ? "" : "Returned indices do not form a valid target sum." };
}

function checkTwoSumSorted(input: unknown, actual: unknown) {
  const data = input as { numbers?: number[]; target?: number };
  if (!Array.isArray(actual) || actual.length !== 2 || !actual.every(Number.isInteger)) {
    return { passed: false, message: "Expected two one-based integer indices." };
  }
  const [left, right] = actual as number[];
  const numbers = data.numbers ?? [];
  const passed = left !== right && left >= 1 && right >= 1 && left <= numbers.length && right <= numbers.length && numbers[left - 1] + numbers[right - 1] === data.target;
  return { passed, message: passed ? "" : "Returned indices do not form a valid target sum." };
}

function checkSetWithLength(input: unknown, expected: unknown, actual: unknown, lengthKey: string) {
  const data = input as Record<string, unknown>;
  if (!Array.isArray(actual) || actual.length !== data[lengthKey]) {
    return { passed: false, message: `Return exactly ${String(lengthKey)} values.` };
  }
  return { passed: setKey(actual) === setKey(expected), message: "" };
}

function checkLongestPalindrome(input: unknown, expected: unknown, actual: unknown) {
  const source = String((input as { s?: string }).s ?? "");
  if (typeof actual !== "string" || typeof expected !== "string") {
    return { passed: false, message: "Expected a string." };
  }
  const passed = source.includes(actual) && actual === [...actual].reverse().join("") && actual.length === expected.length;
  return { passed, message: passed ? "" : "Returned value is not a longest palindromic substring." };
}

function checkMinimumWindow(input: unknown, expected: unknown, actual: unknown) {
  const data = input as { s?: string; t?: string };
  if (typeof actual !== "string" || typeof expected !== "string") {
    return { passed: false, message: "Return a string." };
  }
  if (expected === "") {
    return { passed: actual === "", message: "" };
  }
  const passed = actual.length === expected.length && String(data.s ?? "").includes(actual) && coversChars(actual, String(data.t ?? ""));
  return { passed, message: passed ? "" : "Window has the wrong length or does not cover the target characters." };
}

function checkApproxNumber(expected: unknown, actual: unknown) {
  if (typeof actual !== "number" || typeof expected !== "number") {
    return { passed: false, message: "Expected a numeric result." };
  }
  const tolerance = 1e-7 * Math.max(1, Math.abs(expected));
  return { passed: Math.abs(actual - expected) <= tolerance, message: "" };
}

function checkCourseScheduleOrder(input: unknown, expected: unknown, actual: unknown) {
  const data = input as { numCourses?: number; prerequisites?: number[][] };
  if (Array.isArray(expected) && expected.length === 0) {
    return { passed: Array.isArray(actual) && actual.length === 0, message: "" };
  }
  const n = data.numCourses ?? 0;
  if (!Array.isArray(actual) || actual.length !== n || setKey(actual) !== setKey([...Array(n).keys()])) {
    return { passed: false, message: "Expected a permutation of all courses." };
  }
  const pos = new Map((actual as number[]).map((course, index) => [course, index]));
  const passed = (data.prerequisites ?? []).every(([course, pre]) => (pos.get(pre) ?? Infinity) < (pos.get(course) ?? -1));
  return { passed, message: passed ? "" : "Ordering violates prerequisite precedence." };
}

function checkAlienOrder(input: unknown, expected: unknown, actual: unknown) {
  const words = (input as { words?: string[] }).words ?? [];
  if (expected === "") {
    return { passed: actual === "", message: "" };
  }
  const chars = new Set(words.join(""));
  if (typeof actual !== "string" || actual.length !== chars.size || setKey([...actual]) !== setKey([...chars])) {
    return { passed: false, message: "Expected an ordering containing each alien character once." };
  }
  const pos = new Map([...actual].map((ch, index) => [ch, index]));
  for (let i = 0; i < words.length - 1; i += 1) {
    const left = words[i];
    const right = words[i + 1];
    if (left.length > right.length && left.startsWith(right)) {
      return { passed: actual === "", message: "" };
    }
    for (let j = 0; j < Math.min(left.length, right.length); j += 1) {
      if (left[j] !== right[j]) {
        if ((pos.get(left[j]) ?? Infinity) > (pos.get(right[j]) ?? -1)) {
          return { passed: false, message: "Ordering violates adjacent word precedence." };
        }
        break;
      }
    }
  }
  return { passed: true, message: "" };
}

function coversChars(value: string, target: string): boolean {
  const counts = new Map<string, number>();
  for (const ch of value) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  for (const ch of target) counts.set(ch, (counts.get(ch) ?? 0) - 1);
  return [...counts.values()].every((count) => count >= 0);
}

function normalizeTriplets(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const triplets = [];
  for (const item of value) {
    if (!Array.isArray(item) || item.length !== 3 || !item.every(Number.isInteger)) return null;
    triplets.push(JSON.stringify([...item].sort((a, b) => a - b)));
  }
  return JSON.stringify([...new Set(triplets)].sort());
}

function normalizeGroups(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const groups = [];
  for (const group of value) {
    if (!Array.isArray(group) || !group.every((item) => typeof item === "string")) return null;
    groups.push(JSON.stringify([...group].sort()));
  }
  return JSON.stringify(groups.sort());
}

function normalizeListOfLists(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  try {
    return JSON.stringify(value.map((item) => JSON.stringify(item)).sort());
  } catch {
    return null;
  }
}

function normalizeComboList(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  return JSON.stringify(value.map((item) => {
    if (Array.isArray(item)) {
      return stableKey([...item].sort());
    }
    return stableKey(item);
  }).sort());
}

function sortedKey(value: unknown): string {
  return Array.isArray(value) ? JSON.stringify(value.map(stableKey).sort()) : stableKey(value);
}

function setKey(value: unknown): string {
  return Array.isArray(value) ? JSON.stringify([...new Set(value.map(stableKey))].sort()) : stableKey(value);
}

function stableKey(value: unknown): string {
  return JSON.stringify(canonical(value));
}

function deepEqual(left: unknown, right: unknown): boolean {
  return stableKey(left) === stableKey(right);
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}
