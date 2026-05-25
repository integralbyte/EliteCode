import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../src/App";

vi.mock("@monaco-editor/react", () => ({
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea aria-label="code-editor" value={value} onChange={(event) => onChange(event.target.value)} />
  )
}));

const problem = {
  id: 1,
  slug: "two-sum",
  title: "Two Sum",
  difficulty: "Easy",
  tags: ["Array", "Hash Table"],
  companies: [],
  stats: { accepted: "1", submissions: "2", acceptance_rate: "50%" },
  statement: "# Two Sum\n\nReturn a valid pair.",
  editorial: "Use a hash map.",
  solution_notes: "Reference solution.",
  hints: ["Use complements."],
  similar_questions: [],
  starter_code: { python: "class Solution:\n    def twoSum(self, nums, target):\n        pass\n" },
  entrypoint: { class_name: "Solution", method_name: "twoSum" },
  time_limit_ms: 2000,
  memory_limit_mb: 256,
  cases: [{ id: "case-1", name: "Case 1", input: { nums: [2, 7], target: 9 }, expected: [0, 1], hidden: false }]
};

const acceptedResult = {
  slug: "two-sum",
  verdict: "Accepted",
  passed: true,
  total_cases: 1,
  passed_cases: 1,
  runtime_ms: 1,
  case_results: [
    {
      case_id: "case-1",
      case_name: "Case 1",
      status: "Accepted",
      passed: true,
      hidden: false,
      input: { nums: [2, 7], target: 9 },
      expected: [0, 1],
      actual: [0, 1],
      stdout: "",
      stderr: "",
      message: "",
      runtime_ms: 1
    }
  ],
  analysis: {
    runtime: {
      user_runtime_ms: 1,
      reference_runtime_ms: 1,
      delta_ms: 0,
      ratio: 1,
      relative_label: "within 20% of expected",
      reference_verdict: "Accepted",
      reference_name: "Curated expected solution"
    },
    user_complexity: {
      label: "O(n)",
      confidence: "medium",
      reason: "The deepest detected input-dependent loop nesting is 1.",
      features: ["max loop nesting: 1"],
      observed_growth: null,
      observed_exponent: null
    },
    reference_complexity: {
      label: "O(n)",
      confidence: "medium",
      reason: "The deepest detected input-dependent loop nesting is 1.",
      features: ["max loop nesting: 1"],
      observed_growth: null,
      observed_exponent: null
    },
    notes: ["Complexity is an estimate."]
  }
};

describe("App", () => {
  beforeEach(() => {
    vi.useRealTimers();
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path === "/api/problems") {
        return json({ problems: [{ id: 1, slug: "two-sum", title: "Two Sum", difficulty: "Easy", tags: [], stats: problem.stats, solved: false }], last_opened_slug: null });
      }
      if (path === "/api/problems/two-sum") {
        return json(problem);
      }
      if (path.startsWith("/api/progress/two-sum")) {
        if (init?.method === "PUT") {
          const body = JSON.parse(String(init.body));
          return json({ slug: "two-sum", language: "python", code: body.code, solved: false, settings: body.settings });
        }
        return json({ slug: "two-sum", language: "python", code: problem.starter_code.python, solved: false, settings: {} });
      }
      if (path === "/api/submissions?slug=two-sum") {
        return json([]);
      }
      if (path === "/api/run") {
        return json(acceptedResult);
      }
      return json({}, 404);
    }) as unknown as typeof fetch;
  });

  it("loads the workbench and runs a visible case", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "1. Two Sum" })).toBeInTheDocument();
    expect(screen.getByText("Case 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /run/i }));

    expect(await screen.findByText(/Accepted · 1\/1 cases/)).toBeInTheDocument();
    expect(screen.getByText("Performance")).toBeInTheDocument();
    expect(screen.getByText("Your complexity")).toBeInTheDocument();
  });

  it("autosaves edited code", async () => {
    render(<App />);

    const editor = await screen.findByLabelText("code-editor");
    fireEvent.change(editor, { target: { value: "class Solution:\n    pass\n" } });

    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/progress/two-sum",
          expect.objectContaining({ method: "PUT" })
        );
      },
      { timeout: 1200 }
    );
  });

  it("shows PyScript as an experimental browser runtime", async () => {
    render(<App />);

    const runtime = await screen.findByLabelText("Execution runtime");
    fireEvent.change(runtime, { target: { value: "pyscript" } });

    expect(screen.getByText("Experimental")).toBeInTheDocument();
  });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
