import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const problemsRoot = path.join(root, "problems");
const TARGET_CASES = Number(process.env.ELITECODE_TARGET_CASES ?? 2000);

function writeProblem(spec) {
  const dir = path.join(problemsRoot, spec.slug);
  fs.mkdirSync(dir, { recursive: true });
  const checker = spec.checker ? { type: "python", file: "checker.py" } : { type: "exact" };
  const problem = {
    id: spec.id,
    slug: spec.slug,
    title: spec.title,
    difficulty: spec.difficulty,
    tags: spec.tags,
    companies: [],
    statement: spec.statement.trim(),
    editorial: spec.editorial.trim(),
    solution_notes: spec.solution.trim(),
    hints: spec.hints,
    starter_code: { python: spec.starter.trimEnd() + "\n" },
    entrypoint: { class_name: "Solution", method_name: spec.method },
    checker,
    time_limit_ms: spec.timeLimitMs ?? 2000,
    memory_limit_mb: 256,
    cases: spec.cases.map((item, index) => ({
      id: index < spec.visible ? `case-${index + 1}` : `hidden-${index + 1 - spec.visible}`,
      name: index < spec.visible ? `Case ${index + 1}` : `Hidden Case ${index + 1 - spec.visible}`,
      input: item.input,
      expected: item.expected,
      hidden: index >= spec.visible
    }))
  };
  fs.writeFileSync(path.join(dir, "problem.json"), `${JSON.stringify(problem, null, 2)}\n`);
  if (spec.checker) fs.writeFileSync(path.join(dir, "checker.py"), spec.checker.trimStart());
}

function markdown(title, body, examples, constraints, followUp = "") {
  return `# ${title}

${body.trim()}

## Examples

${examples.map((example, index) => `**Example ${index + 1}**\n\n\`\`\`text\n${example.trim()}\n\`\`\``).join("\n\n")}

## Constraints

${constraints.map((line) => `- ${line}`).join("\n")}${followUp ? `\n\n## Follow-up\n\n${followUp}` : ""}`;
}

function caseFrom(input, expected) {
  return { input, expected };
}

function fillCases(visible, maker, target = TARGET_CASES) {
  const cases = [...visible];
  let seed = 1;
  while (cases.length < target) {
    cases.push(maker(seed));
    seed += 1;
  }
  return { visible: visible.length, cases };
}

function mix(seed, salt = 0) {
  let value = (seed + 0x9e3779b9 + salt * 0x85ebca6b) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d) >>> 0;
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b) >>> 0;
  value ^= value >>> 16;
  return value >>> 0;
}

function word(seed, length = 1 + (mix(seed, 1) % 10), alphabet = "abcde") {
  return Array.from({ length }, (_, i) => alphabet[mix(seed, i + 2) % alphabet.length]).join("");
}

function subsets(nums) {
  const out = [[]];
  for (const num of nums) {
    const size = out.length;
    for (let i = 0; i < size; i += 1) out.push([...out[i], num]);
  }
  return out;
}

function combinationSum(candidates, target) {
  const sorted = [...candidates].sort((a, b) => a - b);
  const out = [];
  function dfs(index, remain, path) {
    if (remain === 0) {
      out.push([...path]);
      return;
    }
    for (let i = index; i < sorted.length; i += 1) {
      if (sorted[i] > remain) break;
      path.push(sorted[i]);
      dfs(i, remain - sorted[i], path);
      path.pop();
    }
  }
  dfs(0, target, []);
  return out;
}

function combinationSum2(candidates, target) {
  const sorted = [...candidates].sort((a, b) => a - b);
  const out = [];
  function dfs(start, remain, path) {
    if (remain === 0) {
      out.push([...path]);
      return;
    }
    for (let i = start; i < sorted.length; i += 1) {
      if (i > start && sorted[i] === sorted[i - 1]) continue;
      if (sorted[i] > remain) break;
      path.push(sorted[i]);
      dfs(i + 1, remain - sorted[i], path);
      path.pop();
    }
  }
  dfs(0, target, []);
  return out;
}

function permute(nums) {
  const out = [];
  const used = new Array(nums.length).fill(false);
  function dfs(path) {
    if (path.length === nums.length) {
      out.push([...path]);
      return;
    }
    for (let i = 0; i < nums.length; i += 1) {
      if (used[i]) continue;
      used[i] = true;
      path.push(nums[i]);
      dfs(path);
      path.pop();
      used[i] = false;
    }
  }
  dfs([]);
  return out;
}

function subsetsWithDup(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const out = [];
  function dfs(index, path) {
    out.push([...path]);
    for (let i = index; i < sorted.length; i += 1) {
      if (i > index && sorted[i] === sorted[i - 1]) continue;
      path.push(sorted[i]);
      dfs(i + 1, path);
      path.pop();
    }
  }
  dfs(0, []);
  return out;
}

function exist(board, word) {
  const rows = board.length;
  const cols = board[0].length;
  function dfs(r, c, index) {
    if (index === word.length) return true;
    if (r < 0 || c < 0 || r === rows || c === cols || board[r][c] !== word[index]) return false;
    const old = board[r][c];
    board[r][c] = "#";
    const found = dfs(r + 1, c, index + 1) || dfs(r - 1, c, index + 1) || dfs(r, c + 1, index + 1) || dfs(r, c - 1, index + 1);
    board[r][c] = old;
    return found;
  }
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) if (dfs(r, c, 0)) return true;
  }
  return false;
}

function palindromePartitions(s) {
  const out = [];
  const isPal = (text) => text === [...text].reverse().join("");
  function dfs(index, path) {
    if (index === s.length) {
      out.push([...path]);
      return;
    }
    for (let end = index + 1; end <= s.length; end += 1) {
      const part = s.slice(index, end);
      if (isPal(part)) {
        path.push(part);
        dfs(end, path);
        path.pop();
      }
    }
  }
  dfs(0, []);
  return out;
}

const phone = { 2: "abc", 3: "def", 4: "ghi", 5: "jkl", 6: "mno", 7: "pqrs", 8: "tuv", 9: "wxyz" };

function letterCombinations(digits) {
  if (!digits) return [];
  const out = [];
  function dfs(index, path) {
    if (index === digits.length) {
      out.push(path);
      return;
    }
    for (const ch of phone[digits[index]]) dfs(index + 1, path + ch);
  }
  dfs(0, "");
  return out;
}

function nQueens(n) {
  if (nQueens.cache.has(n)) return nQueens.cache.get(n);
  const out = [];
  const cols = new Set();
  const diag1 = new Set();
  const diag2 = new Set();
  const board = Array.from({ length: n }, () => ".".repeat(n).split(""));
  function dfs(row) {
    if (row === n) {
      out.push(board.map((line) => line.join("")));
      return;
    }
    for (let col = 0; col < n; col += 1) {
      if (cols.has(col) || diag1.has(row - col) || diag2.has(row + col)) continue;
      cols.add(col); diag1.add(row - col); diag2.add(row + col); board[row][col] = "Q";
      dfs(row + 1);
      board[row][col] = "."; cols.delete(col); diag1.delete(row - col); diag2.delete(row + col);
    }
  }
  dfs(0);
  nQueens.cache.set(n, out);
  return out;
}
nQueens.cache = new Map();

function uniqueNums(seed, length = 1 + (seed % 5)) {
  const set = new Set();
  let attempt = 0;
  while (set.size < length) {
    set.add((mix(seed, attempt + 3) % 101) - 50);
    attempt += 1;
  }
  return [...set];
}

function comboCandidates(seed, length = 2 + (seed % 5)) {
  const set = new Set();
  let attempt = 0;
  while (set.size < length) {
    set.add(1 + (mix(seed, attempt + 11) % 24));
    attempt += 1;
  }
  return [...set].sort((a, b) => a - b);
}

function dupCandidates(seed) {
  return Array.from({ length: 5 + (mix(seed, 15) % 7) }, (_, i) => 1 + (mix(seed, i + 16) % 18)).sort((a, b) => a - b);
}

function boardSeed(seed) {
  const letters = seed % 5 === 0 ? "AB" : "ABCDEFXYZ";
  const rows = 1 + (mix(seed, 21) % 5);
  const cols = 1 + (mix(seed, 22) % 5);
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => letters[mix(seed, r * cols + c + 23) % letters.length])
  );
}

function pathWord(board) {
  return board[0].join("");
}

function stringSeed(seed) {
  if (seed % 6 === 0) return "a".repeat(1 + (seed % 8));
  if (seed % 6 === 1) return `${word(seed, 3 + (seed % 4), "abc")}${word(seed + 7, 2 + (seed % 3), "cba")}`;
  if (seed % 6 === 2) {
    const left = word(seed, 2 + (seed % 5), "abcd");
    return `${left}${[...left].reverse().join("")}`;
  }
  return word(seed, 1 + (mix(seed, 30) % 10), "abcde");
}

const unorderedOuterChecker = `
from __future__ import annotations

import json
from typing import Any


def check(input_data: dict[str, Any], expected: Any, actual: Any) -> dict[str, Any]:
    if not isinstance(actual, list):
        return {"passed": False, "message": "Expected a list."}
    normalize = lambda items: sorted(json.dumps(item, sort_keys=True) for item in items)
    return {"passed": normalize(actual) == normalize(expected), "message": ""}
`;

const unorderedCombinationsChecker = `
from __future__ import annotations

import json
from typing import Any


def normalize_combo(item: Any) -> str:
    if isinstance(item, list):
        try:
            return json.dumps(sorted(item), sort_keys=True)
        except TypeError:
            return json.dumps(item, sort_keys=True)
    return json.dumps(item, sort_keys=True)


def check(input_data: dict[str, Any], expected: Any, actual: Any) -> dict[str, Any]:
    if not isinstance(actual, list):
        return {"passed": False, "message": "Expected a list."}
    return {"passed": sorted(normalize_combo(item) for item in actual) == sorted(normalize_combo(item) for item in expected), "message": ""}
`;

const problems = [
  (() => {
    const visibleRaw = [[1, 2, 4], [0], []];
    const visible = visibleRaw.map((nums) => caseFrom({ nums }, subsets(nums)));
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const nums = uniqueNums(seed);
      return caseFrom({ nums }, subsets(nums));
    });
    return {
      id: 71,
      slug: "subsets",
      title: "Subsets",
      difficulty: "Medium",
      tags: ["Array", "Backtracking", "Bit Manipulation"],
      method: "subsets",
      visible: visibleCount,
      cases,
      checker: unorderedCombinationsChecker,
      statement: markdown("Subsets", "Return every subset of the given unique integers. The order of subsets is ignored.", ["Input: nums = [1,2,4]\nOutput: [[],[1],[2],[4],[1,2],[1,4],[2,4],[1,2,4]]", "Input: nums = [0]\nOutput: [[],[0]]", "Input: nums = []\nOutput: [[]]"], ["All input values are unique.", "Generated cases keep `nums.length` small for display."]),
      editorial: "At each index, either include the number or skip it. This forms the full powerset.",
      solution: "```python\nclass Solution:\n    def subsets(self, nums):\n        out = []\n        def dfs(index, path):\n            if index == len(nums):\n                out.append(path[:])\n                return\n            dfs(index + 1, path)\n            path.append(nums[index])\n            dfs(index + 1, path)\n            path.pop()\n        dfs(0, [])\n        return out\n```",
      hints: ["Each value has two choices: present or absent.", "The empty subset is always included."],
      starter: "class Solution:\n    def subsets(self, nums):\n        pass"
    };
  })(),
  (() => {
    const visibleRaw = [
      { candidates: [2, 3, 6, 7], target: 7 },
      { candidates: [3, 4, 5], target: 8 },
      { candidates: [5], target: 3 }
    ];
    const visible = visibleRaw.map(({ candidates, target }) => caseFrom({ candidates, target }, combinationSum(candidates, target)));
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const candidates = comboCandidates(seed);
      const target = 4 + (seed % 18);
      return caseFrom({ candidates, target }, combinationSum(candidates, target));
    });
    return {
      id: 72,
      slug: "combination-sum",
      title: "Combination Sum",
      difficulty: "Medium",
      tags: ["Array", "Backtracking"],
      method: "combinationSum",
      visible: visibleCount,
      cases,
      checker: unorderedCombinationsChecker,
      statement: markdown("Combination Sum", "Return all unique combinations where candidate numbers sum to `target`. A candidate may be reused any number of times.", ["Input: candidates = [2,3,6,7], target = 7\nOutput: [[2,2,3],[7]]", "Input: candidates = [3,4,5], target = 8\nOutput: [[3,5],[4,4]]", "Input: candidates = [5], target = 3\nOutput: []"], ["Candidate values are positive and unique.", "Combination order is ignored."]),
      editorial: "Sort candidates and backtrack from a start index. Reusing the same index allows unlimited copies while preserving canonical combination order.",
      solution: "```python\nclass Solution:\n    def combinationSum(self, candidates, target):\n        candidates.sort()\n        out = []\n        def dfs(start, remain, path):\n            if remain == 0:\n                out.append(path[:])\n                return\n            for i in range(start, len(candidates)):\n                value = candidates[i]\n                if value > remain:\n                    break\n                path.append(value)\n                dfs(i, remain - value, path)\n                path.pop()\n        dfs(0, target, [])\n        return out\n```",
      hints: ["Sorting lets you stop when a candidate is too large.", "Keep the same index when the candidate can be reused."],
      starter: "class Solution:\n    def combinationSum(self, candidates, target):\n        pass"
    };
  })(),
  (() => {
    const visibleRaw = [
      { candidates: [10, 1, 2, 7, 6, 1, 5], target: 8 },
      { candidates: [2, 5, 2, 1, 2], target: 5 },
      { candidates: [4, 4, 4], target: 8 }
    ];
    const visible = visibleRaw.map(({ candidates, target }) => caseFrom({ candidates, target }, combinationSum2(candidates, target)));
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const candidates = dupCandidates(seed);
      const target = 3 + (seed % 16);
      return caseFrom({ candidates, target }, combinationSum2(candidates, target));
    });
    return {
      id: 73,
      slug: "combination-sum-ii",
      title: "Combination Sum II",
      difficulty: "Medium",
      tags: ["Array", "Backtracking"],
      method: "combinationSum2",
      visible: visibleCount,
      cases,
      checker: unorderedCombinationsChecker,
      statement: markdown("Combination Sum II", "Return all unique combinations that sum to `target` when each candidate position may be used at most once.", ["Input: candidates = [10,1,2,7,6,1,5], target = 8\nOutput: [[1,1,6],[1,2,5],[1,7],[2,6]]", "Input: candidates = [2,5,2,1,2], target = 5\nOutput: [[1,2,2],[5]]", "Input: candidates = [4,4,4], target = 8\nOutput: [[4,4]]"], ["Candidate values are positive.", "Input may contain duplicate values.", "Combination order is ignored."]),
      editorial: "Sort the candidates and skip duplicate values at the same recursion depth. Move to `i + 1` because each position can be used once.",
      solution: "```python\nclass Solution:\n    def combinationSum2(self, candidates, target):\n        candidates.sort()\n        out = []\n        def dfs(start, remain, path):\n            if remain == 0:\n                out.append(path[:])\n                return\n            for i in range(start, len(candidates)):\n                if i > start and candidates[i] == candidates[i - 1]:\n                    continue\n                if candidates[i] > remain:\n                    break\n                path.append(candidates[i])\n                dfs(i + 1, remain - candidates[i], path)\n                path.pop()\n        dfs(0, target, [])\n        return out\n```",
      hints: ["Sort first so equal values are adjacent.", "Skip a repeated value only when it appears at the same depth."],
      starter: "class Solution:\n    def combinationSum2(self, candidates, target):\n        pass"
    };
  })(),
  (() => {
    const visibleRaw = [[1, 2, 3], [0, -1], [5]];
    const visible = visibleRaw.map((nums) => caseFrom({ nums }, permute(nums)));
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const nums = uniqueNums(seed, 1 + (seed % 4));
      return caseFrom({ nums }, permute(nums));
    });
    return {
      id: 74,
      slug: "permutations",
      title: "Permutations",
      difficulty: "Medium",
      tags: ["Array", "Backtracking"],
      method: "permute",
      visible: visibleCount,
      cases,
      checker: unorderedOuterChecker,
      statement: markdown("Permutations", "Return every ordering of the unique input integers. The order of the returned list is ignored, but each permutation's internal order matters.", ["Input: nums = [1,2,3]\nOutput: [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]", "Input: nums = [0,-1]\nOutput: [[0,-1],[-1,0]]", "Input: nums = [5]\nOutput: [[5]]"], ["All values are unique.", "Generated cases keep arrays small."]),
      editorial: "Build a path by choosing each unused value. When path length equals input length, record one permutation.",
      solution: "```python\nclass Solution:\n    def permute(self, nums):\n        out = []\n        used = [False] * len(nums)\n        def dfs(path):\n            if len(path) == len(nums):\n                out.append(path[:])\n                return\n            for i, value in enumerate(nums):\n                if used[i]:\n                    continue\n                used[i] = True\n                path.append(value)\n                dfs(path)\n                path.pop()\n                used[i] = False\n        dfs([])\n        return out\n```",
      hints: ["A value can appear once per permutation.", "Backtrack by undoing the last choice."],
      starter: "class Solution:\n    def permute(self, nums):\n        pass"
    };
  })(),
  (() => {
    const visibleRaw = [[1, 2, 2], [0, 0], []];
    const visible = visibleRaw.map((nums) => caseFrom({ nums }, subsetsWithDup(nums)));
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const nums = Array.from({ length: mix(seed, 40) % 9 }, (_, i) => (mix(seed, i + 41) % 17) - 8).sort((a, b) => a - b);
      return caseFrom({ nums }, subsetsWithDup(nums));
    });
    return {
      id: 75,
      slug: "subsets-ii",
      title: "Subsets II",
      difficulty: "Medium",
      tags: ["Array", "Backtracking", "Bit Manipulation"],
      method: "subsetsWithDup",
      visible: visibleCount,
      cases,
      checker: unorderedCombinationsChecker,
      statement: markdown("Subsets II", "Return every distinct subset when the input may contain duplicate values. Duplicate subsets should appear only once.", ["Input: nums = [1,2,2]\nOutput: [[],[1],[2],[1,2],[2,2],[1,2,2]]", "Input: nums = [0,0]\nOutput: [[],[0],[0,0]]", "Input: nums = []\nOutput: [[]]"], ["Input values may repeat.", "Subset order is ignored."]),
      editorial: "Sort values and skip a duplicate when it would start the same branch at the same recursion depth.",
      solution: "```python\nclass Solution:\n    def subsetsWithDup(self, nums):\n        nums.sort()\n        out = []\n        def dfs(start, path):\n            out.append(path[:])\n            for i in range(start, len(nums)):\n                if i > start and nums[i] == nums[i - 1]:\n                    continue\n                path.append(nums[i])\n                dfs(i + 1, path)\n                path.pop()\n        dfs(0, [])\n        return out\n```",
      hints: ["Sorting makes duplicate skipping local.", "Every recursion state contributes one subset."],
      starter: "class Solution:\n    def subsetsWithDup(self, nums):\n        pass"
    };
  })(),
  (() => {
    const visibleRaw = [
      { board: [["A", "B", "C"], ["D", "E", "F"], ["G", "H", "I"]], word: "ABE" },
      { board: [["A", "B"], ["C", "D"]], word: "ABCD" },
      { board: [["Z"]], word: "Z" }
    ];
    const visible = visibleRaw.map(({ board, word }) => caseFrom({ board, word }, exist(board.map((row) => [...row]), word)));
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const board = boardSeed(seed);
      const word = seed % 3 === 0 ? "ZZZZ" : pathWord(board);
      return caseFrom({ board, word }, exist(board.map((row) => [...row]), word));
    });
    return {
      id: 76,
      slug: "word-search",
      title: "Word Search",
      difficulty: "Medium",
      tags: ["Array", "String", "Backtracking", "Matrix"],
      method: "exist",
      visible: visibleCount,
      cases,
      statement: markdown("Word Search", "Return whether a word can be formed by walking horizontally or vertically through adjacent cells without reusing a cell in the same path.", ["Input: board = [[A,B,C],[D,E,F],[G,H,I]], word = ABE\nOutput: true", "Input: board = [[A,B],[C,D]], word = ABCD\nOutput: false", "Input: board = [[Z]], word = Z\nOutput: true"], ["The board has at least one cell.", "The word is non-empty."]),
      editorial: "Start DFS from each matching cell. Temporarily mark a cell as used while exploring neighbors, then restore it.",
      solution: "```python\nclass Solution:\n    def exist(self, board, word):\n        rows, cols = len(board), len(board[0])\n        def dfs(r, c, index):\n            if index == len(word):\n                return True\n            if r < 0 or c < 0 or r == rows or c == cols or board[r][c] != word[index]:\n                return False\n            ch = board[r][c]\n            board[r][c] = '#'\n            found = dfs(r + 1, c, index + 1) or dfs(r - 1, c, index + 1) or dfs(r, c + 1, index + 1) or dfs(r, c - 1, index + 1)\n            board[r][c] = ch\n            return found\n        return any(dfs(r, c, 0) for r in range(rows) for c in range(cols))\n```",
      hints: ["A cell can be reused by different attempts, just not by the same path.", "Restore cells after each DFS branch."],
      starter: "class Solution:\n    def exist(self, board, word):\n        pass"
    };
  })(),
  (() => {
    const visibleRaw = ["aab", "abba", "abc"];
    const visible = visibleRaw.map((s) => caseFrom({ s }, palindromePartitions(s)));
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const s = stringSeed(seed);
      return caseFrom({ s }, palindromePartitions(s));
    });
    return {
      id: 77,
      slug: "palindrome-partitioning",
      title: "Palindrome Partitioning",
      difficulty: "Medium",
      tags: ["String", "Dynamic Programming", "Backtracking"],
      method: "partition",
      visible: visibleCount,
      cases,
      checker: unorderedOuterChecker,
      statement: markdown("Palindrome Partitioning", "Split the string into substrings so every substring is a palindrome. Return every valid partition.", ["Input: s = aab\nOutput: [[a,a,b],[aa,b]]", "Input: s = abba\nOutput: [[a,b,b,a],[a,bb,a],[abba]]", "Input: s = abc\nOutput: [[a,b,c]]"], ["`s` contains lowercase letters.", "Returned partition order is ignored."]),
      editorial: "Backtrack over every palindromic prefix, then partition the remaining suffix.",
      solution: "```python\nclass Solution:\n    def partition(self, s):\n        out = []\n        def is_pal(left, right):\n            while left < right:\n                if s[left] != s[right]:\n                    return False\n                left += 1\n                right -= 1\n            return True\n        def dfs(index, path):\n            if index == len(s):\n                out.append(path[:])\n                return\n            for end in range(index, len(s)):\n                if is_pal(index, end):\n                    path.append(s[index:end + 1])\n                    dfs(end + 1, path)\n                    path.pop()\n        dfs(0, [])\n        return out\n```",
      hints: ["Choose palindromic prefixes only.", "A single character is always a palindrome."],
      starter: "class Solution:\n    def partition(self, s):\n        pass"
    };
  })(),
  (() => {
    const visibleRaw = ["23", "", "79"];
    const visible = visibleRaw.map((digits) => caseFrom({ digits }, letterCombinations(digits)));
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const chars = "23456789";
      const length = seed % 19 === 0 ? 0 : 4;
      const digits = Array.from({ length }, (_, i) => chars[Math.floor(seed / (8 ** i)) % chars.length]).join("");
      return caseFrom({ digits }, letterCombinations(digits));
    });
    return {
      id: 78,
      slug: "letter-combinations-of-a-phone-number",
      title: "Letter Combinations of a Phone Number",
      difficulty: "Medium",
      tags: ["Hash Table", "String", "Backtracking"],
      method: "letterCombinations",
      visible: visibleCount,
      cases,
      checker: unorderedOuterChecker,
      statement: markdown("Letter Combinations of a Phone Number", "Map digits `2` through `9` to phone keypad letters and return every possible letter string represented by the input digits.", ["Input: digits = 23\nOutput: [ad,ae,af,bd,be,bf,cd,ce,cf]", "Input: digits = \"\"\nOutput: []", "Input: digits = 79\nOutput: [pw,px,py,pz,qw,...,sz]"], ["Digits contain only `2` through `9`.", "Output order is ignored."]),
      editorial: "For each digit, append each possible letter to every partial combination.",
      solution: "```python\nclass Solution:\n    def letterCombinations(self, digits):\n        if not digits:\n            return []\n        mapping = {'2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl', '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz'}\n        out = []\n        def dfs(index, path):\n            if index == len(digits):\n                out.append(path)\n                return\n            for ch in mapping[digits[index]]:\n                dfs(index + 1, path + ch)\n        dfs(0, '')\n        return out\n```",
      hints: ["This is a cartesian product over digit choices.", "The empty input has no combinations."],
      starter: "class Solution:\n    def letterCombinations(self, digits):\n        pass"
    };
  })(),
  (() => {
    const visibleRaw = [4, 1, 3];
    const visible = visibleRaw.map((n) => caseFrom({ n }, nQueens(n)));
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const n = 1 + (seed % 8);
      return caseFrom({ n }, nQueens(n));
    });
    return {
      id: 79,
      slug: "n-queens",
      title: "N-Queens",
      difficulty: "Hard",
      tags: ["Array", "Backtracking"],
      method: "solveNQueens",
      visible: visibleCount,
      cases,
      checker: unorderedOuterChecker,
      statement: markdown("N-Queens", "Place `n` queens on an `n x n` chessboard so no two queens attack each other. Return every board, using `Q` for queens and `.` for empty cells.", ["Input: n = 4\nOutput: [[.Q..,...Q,Q...,..Q.],[..Q.,Q...,...Q,.Q..]]", "Input: n = 1\nOutput: [[Q]]", "Input: n = 3\nOutput: []"], ["`1 <= n <= 8` in generated tests.", "Board order is ignored."]),
      editorial: "Place one queen per row while tracking used columns and diagonals. Backtrack when a placement conflicts.",
      solution: "```python\nclass Solution:\n    def solveNQueens(self, n):\n        out = []\n        cols, diag1, diag2 = set(), set(), set()\n        board = [['.'] * n for _ in range(n)]\n        def dfs(row):\n            if row == n:\n                out.append([''.join(line) for line in board])\n                return\n            for col in range(n):\n                if col in cols or row - col in diag1 or row + col in diag2:\n                    continue\n                cols.add(col); diag1.add(row - col); diag2.add(row + col); board[row][col] = 'Q'\n                dfs(row + 1)\n                board[row][col] = '.'; cols.remove(col); diag1.remove(row - col); diag2.remove(row + col)\n        dfs(0)\n        return out\n```",
      hints: ["One queen per row is enough to explore all boards.", "Both diagonals can be represented by `row - col` and `row + col`."],
      starter: "class Solution:\n    def solveNQueens(self, n):\n        pass"
    };
  })()
];

for (const problem of problems) {
  writeProblem(problem);
}

console.log(`Generated ${problems.length} backtracking problem packs.`);
