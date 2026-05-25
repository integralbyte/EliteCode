import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const problemsRoot = path.join(root, "problems");
const TARGET_CASES = Number(process.env.ELITECODE_TARGET_CASES ?? 2000);

function problemPath(slug) {
  return path.join(problemsRoot, slug);
}

function writeProblem(spec) {
  const dir = problemPath(spec.slug);
  fs.mkdirSync(dir, { recursive: true });
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
    checker: spec.checker ? { type: "python", file: "checker.py" } : { type: "exact" },
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
  if (spec.checker) {
    fs.writeFileSync(path.join(dir, "checker.py"), spec.checker.trimEnd() + "\n");
  }
}

function markdown(title, body, examples, constraints, followUp = "") {
  const exampleText = examples
    .map((example, index) => `**Example ${index + 1}**\n\n\`\`\`text\n${example.trim()}\n\`\`\``)
    .join("\n\n");
  return `# ${title}

${body.trim()}

## Examples

${exampleText}

## Constraints

${constraints.map((line) => `- ${line}`).join("\n")}${followUp ? `\n\n## Follow-up\n\n${followUp}` : ""}`;
}

function visibleFirst(cases, visible = 3) {
  return { cases, visible };
}

function containsDuplicate(nums) {
  return new Set(nums).size !== nums.length;
}

function anagram(s, t) {
  return s.length === t.length && [...s].sort().join("") === [...t].sort().join("");
}

function groupAnagrams(strs) {
  const groups = new Map();
  for (const word of strs) {
    const key = [...word].sort().join("");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(word);
  }
  return [...groups.values()];
}

function topK(nums, k) {
  const counts = new Map();
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, k).map(([n]) => n);
}

function productExceptSelf(nums) {
  const result = Array(nums.length).fill(1);
  let prefix = 1;
  for (let i = 0; i < nums.length; i += 1) {
    result[i] = prefix;
    prefix *= nums[i];
  }
  let suffix = 1;
  for (let i = nums.length - 1; i >= 0; i -= 1) {
    result[i] *= suffix;
    suffix *= nums[i];
  }
  return result;
}

function validSudoku(board) {
  const seen = new Set();
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const value = board[r][c];
      if (value === ".") continue;
      const row = `r${r}:${value}`;
      const col = `c${c}:${value}`;
      const box = `b${Math.floor(r / 3)}:${Math.floor(c / 3)}:${value}`;
      if (seen.has(row) || seen.has(col) || seen.has(box)) return false;
      seen.add(row);
      seen.add(col);
      seen.add(box);
    }
  }
  return true;
}

function longestConsecutive(nums) {
  const values = new Set(nums);
  let best = 0;
  for (const n of values) {
    if (values.has(n - 1)) continue;
    let current = n;
    while (values.has(current)) current += 1;
    best = Math.max(best, current - n);
  }
  return best;
}

function twoSumCase(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i += 1) {
    const need = target - nums[i];
    if (seen.has(need)) return { input: { nums, target }, expected: [seen.get(need), i] };
    seen.set(nums[i], i);
  }
  throw new Error("two sum case has no answer");
}

function caseFrom(input, expected) {
  return { input, expected };
}

function shuffle(values, seed) {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = mix(seed, i) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
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

function wordFromSeed(seed, length = 3 + (seed % 7)) {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  return Array.from({ length }, (_, i) => letters[mix(seed, i + 200) % letters.length]).join("");
}

function generatedArrayCase(slug, seed) {
  if (slug === "contains-duplicate") {
    const length = 1 + (seed % 96);
    const nums = Array.from({ length }, (_, i) => (seed % 11 === 0 ? 0 : i * (seed % 7 + 1) - seed));
    if (seed % 2 === 0 && nums.length > 1) nums[seed % nums.length] = nums[0];
    if (seed % 5 === 0) nums.push(-1_000_000_000, 1_000_000_000);
    return caseFrom({ nums }, containsDuplicate(nums));
  }

  if (slug === "valid-anagram") {
    const base = wordFromSeed(seed, seed % 17 === 0 ? 0 : 1 + (mix(seed, 301) % 60));
    const t = seed % 3 === 0 ? shuffle([...base], seed).join("") : shuffle([...base], seed).join("") + "x";
    return caseFrom({ s: base, t }, anagram(base, t));
  }

  if (slug === "two-sum") {
    const length = 2 + (seed % 80);
    const nums = Array.from({ length }, (_, i) => (seed * 17 + i * 19) % 2001 - 1000);
    const left = seed % length;
    let right = (seed * 7 + 1) % length;
    if (right === left) right = (right + 1) % length;
    const target = nums[left] + nums[right];
    return twoSumCase(nums, target);
  }

  if (slug === "group-anagrams") {
    const groups = 1 + (seed % 7);
    const strs = [];
    for (let g = 0; g < groups; g += 1) {
      const word = wordFromSeed(seed + g * 13, 1 + ((seed + g) % 8));
      const variants = 1 + ((seed + g) % 4);
      for (let i = 0; i < variants; i += 1) strs.push(shuffle([...word], seed + i + g).join(""));
    }
    if (seed % 6 === 0) strs.push("", "");
    return caseFrom({ strs }, groupAnagrams(strs));
  }

  if (slug === "top-k-frequent-elements") {
    const distinct = 2 + (mix(seed, 170) % 24);
    const values = [];
    let attempt = 0;
    while (values.length < distinct) {
      const value = (mix(seed, attempt + 171) % 4001) - 2000;
      if (!values.includes(value)) values.push(value);
      attempt += 1;
    }
    const nums = [];
    for (let rank = 0; rank < distinct; rank += 1) {
      const count = distinct - rank + 1 + (seed % 5);
      for (let i = 0; i < count; i += 1) nums.push(values[rank]);
    }
    const k = 1 + (mix(seed, 195) % distinct);
    return caseFrom({ nums: shuffle(nums, seed), k }, topK(nums, k));
  }

  if (slug === "product-of-array-except-self") {
    const length = 2 + (mix(seed, 401) % 20);
    const nums = Array.from({ length }, (_, i) => ((mix(seed, i + 402) % 5) - 2) || 1);
    if (seed % 4 === 0) nums[seed % length] = 0;
    if (seed % 8 === 0 && length > 2) nums[(seed + 1) % length] = 0;
    return caseFrom({ nums }, productExceptSelf(nums));
  }

  if (slug === "valid-sudoku") {
    return sudokuGeneratedCase(seed);
  }

  if (slug === "encode-and-decode-strings") {
    const count = seed % 12;
    const strs = Array.from({ length: count }, (_, i) => {
      if (i % 5 === 0) return "";
      if (i % 5 === 1) return `${i}#${wordFromSeed(seed + i)}`;
      if (i % 5 === 2) return ` ${wordFromSeed(seed + i)} `;
      if (i % 5 === 3) return "\\\\".repeat(1 + (seed % 4));
      return wordFromSeed(seed + i, 1 + ((seed + i) % 50));
    });
    return caseFrom({ strs }, strs);
  }

  if (slug === "longest-consecutive-sequence") {
    const length = seed % 120;
    const nums = Array.from({ length }, (_, i) => (seed % 2 === 0 ? i - Math.floor(length / 2) : i * 2 - seed));
    if (seed % 3 === 0) nums.push(...Array.from({ length: 1 + (seed % 20) }, (_, i) => 500 + i));
    if (seed % 5 === 0) nums.push(...nums.slice(0, Math.min(10, nums.length)));
    return caseFrom({ nums: shuffle(nums, seed) }, longestConsecutive(nums));
  }

  throw new Error(`No generated case factory for ${slug}`);
}

function expandCases(spec) {
  let seed = 1;
  while (spec.cases.length < TARGET_CASES) {
    spec.cases.push(generatedArrayCase(spec.slug, seed));
    seed += 1;
  }
}

const sudokuBase = [
  ["5", "3", ".", ".", "7", ".", ".", ".", "."],
  ["6", ".", ".", "1", "9", "5", ".", ".", "."],
  [".", "9", "8", ".", ".", ".", ".", "6", "."],
  ["8", ".", ".", ".", "6", ".", ".", ".", "3"],
  ["4", ".", ".", "8", ".", "3", ".", ".", "1"],
  ["7", ".", ".", ".", "2", ".", ".", ".", "6"],
  [".", "6", ".", ".", ".", ".", "2", "8", "."],
  [".", ".", ".", "4", "1", "9", ".", ".", "5"],
  [".", ".", ".", ".", "8", ".", ".", "7", "9"]
];

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function sudokuCase(mutator = (board) => board) {
  const board = mutator(cloneBoard(sudokuBase));
  return caseFrom({ board }, validSudoku(board));
}

function sudokuGeneratedCase(seed) {
  const digitMap = Array.from({ length: 9 }, (_, i) => String(((i + (seed % 9)) % 9) + 1));
  const board = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => {
      const value = (r * 3 + Math.floor(r / 3) + c + Math.floor(seed / 9)) % 9;
      return digitMap[value];
    })
  );

  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (mix(seed, r * 9 + c) % 4 === 0) board[r][c] = ".";
    }
  }

  const mode = seed % 7;
  if (mode === 1) {
    const r = mix(seed, 100) % 9;
    const c1 = mix(seed, 101) % 9;
    let c2 = mix(seed, 102) % 9;
    if (c1 === c2) c2 = (c2 + 1) % 9;
    if (board[r][c1] === ".") board[r][c1] = String(1 + (mix(seed, 103) % 9));
    board[r][c2] = board[r][c1];
  } else if (mode === 2) {
    const c = mix(seed, 104) % 9;
    const r1 = mix(seed, 105) % 9;
    let r2 = mix(seed, 106) % 9;
    if (r1 === r2) r2 = (r2 + 1) % 9;
    if (board[r1][c] === ".") board[r1][c] = String(1 + (mix(seed, 107) % 9));
    board[r2][c] = board[r1][c];
  } else if (mode === 3) {
    const br = Math.floor((mix(seed, 108) % 9) / 3) * 3;
    const bc = Math.floor((mix(seed, 109) % 9) / 3) * 3;
    const r1 = br + (mix(seed, 110) % 3);
    const c1 = bc + (mix(seed, 111) % 3);
    let r2 = br + (mix(seed, 112) % 3);
    let c2 = bc + (mix(seed, 113) % 3);
    if (r1 === r2 && c1 === c2) c2 = bc + ((c2 - bc + 1) % 3);
    if (board[r1][c1] === ".") board[r1][c1] = String(1 + (mix(seed, 114) % 9));
    board[r2][c2] = board[r1][c1];
  } else if (mode === 4) {
    const r = mix(seed, 115) % 9;
    const c = mix(seed, 116) % 9;
    for (let i = 0; i < 9; i += 1) {
      board[r][i] = ".";
      board[i][c] = ".";
    }
  }
  return caseFrom({ board }, validSudoku(board));
}

const groupChecker = `
from __future__ import annotations

from typing import Any


def _normalise(groups: Any) -> list[list[str]] | None:
    if not isinstance(groups, list):
        return None
    normalised: list[list[str]] = []
    for group in groups:
        if not isinstance(group, list) or not all(isinstance(item, str) for item in group):
            return None
        normalised.append(sorted(group))
    return sorted(normalised)


def check(input_data: dict[str, Any], expected: list[list[str]], actual: Any) -> dict[str, Any]:
    expected_norm = _normalise(expected)
    actual_norm = _normalise(actual)
    if actual_norm is None:
        return {"passed": False, "message": "Return a list of string groups."}
    return {"passed": actual_norm == expected_norm, "message": ""}
`;

const topKChecker = `
from __future__ import annotations

from typing import Any


def check(input_data: dict[str, Any], expected: list[int], actual: Any) -> dict[str, Any]:
    if not isinstance(actual, list) or not all(isinstance(value, int) for value in actual):
        return {"passed": False, "message": "Return a list of integers."}
    if len(actual) != input_data["k"]:
        return {"passed": False, "message": "Return exactly k values."}
    return {"passed": set(actual) == set(expected), "message": ""}
`;

const twoSumChecker = `
from __future__ import annotations

from typing import Any


def check(input_data: dict[str, Any], expected: list[int], actual: Any) -> dict[str, Any]:
    nums = input_data["nums"]
    target = input_data["target"]

    if not isinstance(actual, list) or len(actual) != 2:
        return {"passed": False, "message": "Expected a list containing exactly two indices."}

    if not all(isinstance(index, int) for index in actual):
        return {"passed": False, "message": "Both returned values must be integer indices."}

    left, right = actual
    if left == right:
        return {"passed": False, "message": "The same index cannot be used twice."}

    if left < 0 or right < 0 or left >= len(nums) or right >= len(nums):
        return {"passed": False, "message": "One or both indices are outside the input array."}

    if nums[left] + nums[right] != target:
        return {
            "passed": False,
            "message": f"nums[{left}] + nums[{right}] is {nums[left] + nums[right]}, not {target}.",
        }

    return {"passed": True, "message": ""}
`;

const problems = [
  {
    id: 1,
    slug: "contains-duplicate",
    title: "Contains Duplicate",
    difficulty: "Easy",
    tags: ["Array", "Hash Table"],
    method: "hasDuplicate",
    ...visibleFirst([
      caseFrom({ nums: [9, 1, 4, 9] }, true),
      caseFrom({ nums: [3, 8, 11, 14] }, false),
      caseFrom({ nums: [-2, -2, 5] }, true),
      ...[
        [1],
        [1, 2],
        [1, 2, 1],
        [0, 0],
        [-1, 0, 1],
        [-1, 0, -1],
        [5, 4, 3, 2, 1],
        [5, 4, 3, 2, 5],
        [100000, -100000, 0],
        [7, 7, 7, 7],
        [2, 3, 4, 5, 6, 7],
        [2, 3, 4, 5, 6, 2],
        [13, 21, 34, 55],
        [13, 21, 34, 55, 21],
        Array.from({ length: 30 }, (_, i) => i),
        [...Array.from({ length: 30 }, (_, i) => i), 12],
        [999, 998, 997, 996, 995, 994],
        [999, 998, 997, 996, 995, 999],
        [-5, -4, -3, -2, -1, 0, 1],
        [-5, -4, -3, -2, -1, 0, -4],
        [42, 17, 42],
        [8, 6, 7, 5, 3, 0, 9],
        [8, 6, 7, 5, 3, 0, 8],
        Array.from({ length: 60 }, (_, i) => i * 2),
        [...Array.from({ length: 60 }, (_, i) => i * 2), 44]
      ].map((nums) => caseFrom({ nums }, containsDuplicate(nums)))
    ]),
    statement: markdown(
      "Contains Duplicate",
      "Given an integer array `nums`, decide whether any value appears at least twice. Return `true` as soon as a repeated value exists; otherwise return `false`.",
      [
        "Input: nums = [9, 1, 4, 9]\nOutput: true",
        "Input: nums = [3, 8, 11, 14]\nOutput: false",
        "Input: nums = [-2, -2, 5]\nOutput: true"
      ],
      ["`1 <= len(nums) <= 100000`", "`-10^9 <= nums[i] <= 10^9`"]
    ),
    editorial: "Store each value in a set as you scan the array. If a value is already present, a duplicate has been found. If the scan finishes, every value was unique.",
    solution: "```python\nclass Solution:\n    def hasDuplicate(self, nums):\n        seen = set()\n        for value in nums:\n            if value in seen:\n                return True\n            seen.add(value)\n        return False\n```",
    hints: ["A direct pair comparison works but repeats a lot of checks.", "A set answers membership questions in constant average time."],
    starter: "class Solution:\n    def hasDuplicate(self, nums):\n        pass"
  },
  {
    id: 2,
    slug: "valid-anagram",
    title: "Valid Anagram",
    difficulty: "Easy",
    tags: ["Hash Table", "String"],
    method: "isAnagram",
    ...visibleFirst([
      caseFrom({ s: "listen", t: "silent" }, true),
      caseFrom({ s: "binary", t: "brainy" }, true),
      caseFrom({ s: "apple", t: "papelx" }, false),
      ...[
        ["", ""],
        ["a", "a"],
        ["a", "b"],
        ["rat", "tar"],
        ["rat", "car"],
        ["night", "thing"],
        ["state", "taste"],
        ["state", "tastes"],
        ["aaaaab", "baaaaa"],
        ["aaaaab", "aaaaaa"],
        ["abcabc", "cbacba"],
        ["abcabc", "cbacbb"],
        ["conversation", "voicesranton"],
        ["conversation", "conservation"],
        ["zzxy", "xyzz"],
        ["zzxy", "xyza"],
        ["anagram", "nagaram"],
        ["algorithm", "logarithm"],
        ["dusty", "study"],
        ["below", "elbow"],
        ["inch", "chin"],
        ["binary", "brainz"],
        ["a".repeat(50) + "b", "b" + "a".repeat(50)],
        ["a".repeat(50) + "b", "a".repeat(51)]
      ].map(([s, t]) => caseFrom({ s, t }, anagram(s, t)))
    ]),
    statement: markdown(
      "Valid Anagram",
      "Two strings are anagrams when they contain the same characters with the same frequencies. Given `s` and `t`, return whether `t` can be rearranged into `s`.",
      [
        "Input: s = \"listen\", t = \"silent\"\nOutput: true",
        "Input: s = \"binary\", t = \"brainy\"\nOutput: true",
        "Input: s = \"apple\", t = \"papelx\"\nOutput: false"
      ],
      ["`0 <= len(s), len(t) <= 50000`", "`s` and `t` contain lowercase English letters."]
    ),
    editorial: "Count the characters in both strings and compare the counts. Sorting also works, but counting keeps the runtime linear.",
    solution: "```python\nfrom collections import Counter\n\nclass Solution:\n    def isAnagram(self, s, t):\n        return Counter(s) == Counter(t)\n```",
    hints: ["If the lengths differ, the answer is immediately false.", "The order of characters does not matter; only counts matter."],
    starter: "class Solution:\n    def isAnagram(self, s, t):\n        pass"
  },
  {
    id: 3,
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    tags: ["Array", "Hash Table"],
    method: "twoSum",
    checker: twoSumChecker,
    ...visibleFirst([
      twoSumCase([4, 6, 10, 15], 16),
      twoSumCase([5, 1, 9, 3], 8),
      twoSumCase([-2, 11, 7, 4], 9),
      ...[
        [[2, 7, 11, 15], 9],
        [[3, 2, 4], 6],
        [[3, 3], 6],
        [[0, 4, 3, 0], 0],
        [[-1, -2, -3, -4, -5], -8],
        [[1000000000, -1000000000, 3, 8], 0],
        [[5, 75, 25], 100],
        [[1, 5, 9, 14, 20], 34],
        [[10, -10, 5, 2], -5],
        [[6, 1, 2, 3, 4], 10],
        [[11, 15, 2, 7], 9],
        [[-7, 12, 19, 5], 12],
        [[8, 8, 3, 4], 16],
        [[13, -3, 0, 6], 3],
        [[1, 2, 3, 4, 5, 6], 11],
        [[50, 20, 30, 40], 70],
        [[-10, 20, -30, 40], 10],
        [[17, 1, 9, 11, 4], 21],
        [[101, 202, 303, 404], 505],
        [[-100, -50, 0, 50, 100], 0],
        [[12, 24, 36, 48], 60],
        [[7, 14, 28, 56], 35],
        [[42, 13, 29, 71], 84],
        [[9, -4, 6, -2], 2]
      ].map(([nums, target]) => twoSumCase(nums, target))
    ]),
    statement: markdown(
      "Two Sum",
      "Given a list of integers `nums` and an integer `target`, return the indices of two different elements whose values add up to `target`. Each test has one valid pair, and either index order is accepted.",
      [
        "Input: nums = [4, 6, 10, 15], target = 16\nOutput: [1, 2]",
        "Input: nums = [5, 1, 9, 3], target = 8\nOutput: [0, 3]",
        "Input: nums = [-2, 11, 7, 4], target = 9\nOutput: [0, 1]"
      ],
      ["`2 <= len(nums) <= 10000`", "`-10^9 <= nums[i], target <= 10^9`", "Exactly one valid answer exists."],
      "Can you solve it with one pass through the array?"
    ),
    editorial: "Keep a dictionary from value to index. For each value, check whether its complement was seen earlier. If so, return the stored index and the current index.",
    solution: "```python\nclass Solution:\n    def twoSum(self, nums, target):\n        seen = {}\n        for i, value in enumerate(nums):\n            need = target - value\n            if need in seen:\n                return [seen[need], i]\n            seen[value] = i\n```",
    hints: ["A brute force solution tries every pair.", "If you know one number, the other number must be `target - number`."],
    starter: "class Solution:\n    def twoSum(self, nums, target):\n        pass"
  },
  {
    id: 4,
    slug: "group-anagrams",
    title: "Group Anagrams",
    difficulty: "Medium",
    tags: ["Array", "Hash Table", "String"],
    method: "groupAnagrams",
    checker: groupChecker,
    ...visibleFirst([
      caseFrom({ strs: ["eat", "tea", "tan", "ate", "nat", "bat"] }, groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"])),
      caseFrom({ strs: [""] }, groupAnagrams([""])),
      caseFrom({ strs: ["abc", "bca", "cab", "xyz"] }, groupAnagrams(["abc", "bca", "cab", "xyz"])),
      ...[
        ["a"],
        ["ab", "ba", "abc", "cab", "bca"],
        ["listen", "silent", "enlist", "google"],
        ["rat", "tar", "art", "car"],
        ["", "", "a"],
        ["aaa", "aa", "a"],
        ["dusty", "study", "night", "thing"],
        ["loop", "pool", "polo", "lopo"],
        ["abc", "def", "ghi"],
        ["abc", "cba", "bac", "foo", "ofo"],
        ["z", "z", "zz"],
        ["stone", "tones", "onset", "notes"],
        ["evil", "vile", "veil", "live"],
        ["inch", "chin", "brag", "grab"],
        ["elbow", "below", "state", "taste"],
        ["abcabc", "cbacba", "aabbcc"],
        ["one", "two", "three"],
        ["aabb", "bbaa", "abab", "baba"],
        ["redivider", "dividerer", "redder"],
        ["abc", "abcd", "bcad", "dacb"],
        ["p", "q", "r", "p"],
        ["moon", "mono", "noom", "nomad"],
        ["arc", "car", "rat", "tar", "art"],
        ["save", "vase", "aves", "stone"]
      ].map((strs) => caseFrom({ strs }, groupAnagrams(strs)))
    ]),
    statement: markdown(
      "Group Anagrams",
      "Given a list of strings, group together the words that are anagrams of one another. The groups and the words inside each group may be returned in any order.",
      [
        "Input: strs = [\"eat\", \"tea\", \"tan\", \"ate\", \"nat\", \"bat\"]\nOutput: [[\"eat\", \"tea\", \"ate\"], [\"tan\", \"nat\"], [\"bat\"]]",
        "Input: strs = [\"\"]\nOutput: [[\"\"]]",
        "Input: strs = [\"abc\", \"bca\", \"cab\", \"xyz\"]\nOutput: [[\"abc\", \"bca\", \"cab\"], [\"xyz\"]]"
      ],
      ["`1 <= len(strs) <= 10000`", "`0 <= len(strs[i]) <= 100`", "`strs[i]` contains lowercase English letters."]
    ),
    editorial: "All anagrams share the same sorted character sequence. Use that sorted sequence, or a 26-count tuple, as a dictionary key and append each word to its group.",
    solution: "```python\nfrom collections import defaultdict\n\nclass Solution:\n    def groupAnagrams(self, strs):\n        groups = defaultdict(list)\n        for word in strs:\n            groups[''.join(sorted(word))].append(word)\n        return list(groups.values())\n```",
    hints: ["Words in the same group have the same character counts.", "A dictionary can map a signature to the words that share it."],
    starter: "class Solution:\n    def groupAnagrams(self, strs):\n        pass"
  },
  {
    id: 5,
    slug: "top-k-frequent-elements",
    title: "Top K Frequent Elements",
    difficulty: "Medium",
    tags: ["Array", "Hash Table", "Heap"],
    method: "topKFrequent",
    checker: topKChecker,
    ...visibleFirst([
      caseFrom({ nums: [4, 4, 4, 2, 2, 9], k: 2 }, [4, 2]),
      caseFrom({ nums: [1], k: 1 }, [1]),
      caseFrom({ nums: [-1, -1, -2, -3, -3, -3], k: 2 }, [-3, -1]),
      ...[
        [[1, 1, 2, 3], 1],
        [[1, 1, 2, 2, 2, 3], 2],
        [[5, 5, 5, 6, 6, 7], 2],
        [[9, 8, 7, 7, 7, 8, 8, 8, 1], 2],
        [[0, 0, 0, 1, 1, 2], 1],
        [[-5, -5, -4, -4, -4, -3], 2],
        [[10, 10, 11, 12, 12, 12, 13, 13], 3],
        [[2, 2, 2, 2, 3, 3, 4], 2],
        [[6, 7, 7, 8, 8, 8, 9, 9, 9, 9], 1],
        [[1, 2, 2, 3, 3, 3, 4, 4, 4, 4], 2],
        [[100, 100, 50, 50, 50, 25], 2],
        [[-1, -1, -1, 0, 0, 5], 2],
        [[3, 3, 4, 4, 4, 5, 5, 5, 5], 3],
        [[11, 12, 12, 13, 13, 13], 2],
        [[1, 1, 1, 2, 2, 3, 4], 3],
        [[7, 7, 7, 8, 9, 9], 2],
        [[5, 6, 6, 7, 7, 7, 8, 8, 8, 8], 2],
        [[-10, -10, -10, -9, -9, -8], 1],
        [[2, 3, 3, 4, 4, 4, 5, 5, 5, 5], 4],
        [[42], 1],
        [[4, 4, 6, 6, 6, 8, 8, 8, 8, 10], 3],
        [[1, 1, 2, 2, 2, 3, 3, 3, 3, 4], 1],
        [[-2, -2, -1, -1, -1, 3, 3, 3, 3], 2],
        [[0, 1, 1, 1, 2, 2, 2, 2, 3], 2]
      ].map(([nums, k]) => caseFrom({ nums, k }, topK(nums, k)))
    ]),
    statement: markdown(
      "Top K Frequent Elements",
      "Given `nums` and an integer `k`, return the `k` distinct values that occur most often. Test cases avoid frequency ties at the cutoff, and the answer may be returned in any order.",
      [
        "Input: nums = [4, 4, 4, 2, 2, 9], k = 2\nOutput: [4, 2]",
        "Input: nums = [1], k = 1\nOutput: [1]",
        "Input: nums = [-1, -1, -2, -3, -3, -3], k = 2\nOutput: [-3, -1]"
      ],
      ["`1 <= len(nums) <= 100000`", "`1 <= k <= number of distinct values in nums`"]
    ),
    editorial: "Count each value first. Then either keep a heap of size `k`, bucket values by frequency, or sort the counts. The expected answer is the set of values with the largest frequencies.",
    solution: "```python\nfrom collections import Counter\n\nclass Solution:\n    def topKFrequent(self, nums, k):\n        counts = Counter(nums)\n        return [value for value, _ in counts.most_common(k)]\n```",
    hints: ["First reduce the array to value frequencies.", "When `k` is small, a heap avoids sorting every distinct value."],
    starter: "class Solution:\n    def topKFrequent(self, nums, k):\n        pass"
  },
  {
    id: 6,
    slug: "product-of-array-except-self",
    title: "Product of Array Except Self",
    difficulty: "Medium",
    tags: ["Array", "Prefix Product"],
    method: "productExceptSelf",
    ...visibleFirst([
      caseFrom({ nums: [2, 3, 4, 5] }, [60, 40, 30, 24]),
      caseFrom({ nums: [-1, 1, 0, 3] }, [0, 0, -3, 0]),
      caseFrom({ nums: [0, 4, 0] }, [0, 0, 0]),
      ...[
        [1, 2, 3, 4],
        [-1, 2, -3, 4],
        [5, 0, 2],
        [0, 1, 2, 3],
        [9, 8],
        [-2, -3, -4],
        [1, 1, 1, 1],
        [2, 2, 2, 2, 2],
        [3, -1, 2, -5],
        [10, 1, 1, 1],
        [-1, -1, -1, -1],
        [4, 0, 5, 6],
        [0, 0, 5, 6],
        [7, 3, 5],
        [2, 5, 9, 11],
        [6, -2, 3],
        [8, 1, -1, 2],
        [12, 3],
        [1, 2],
        [2, 3, 0, 4],
        [-5, 1, 2, 3],
        [4, 5, 6, 7],
        [1, -2, 3, -4, 5],
        [11, 13, 17]
      ].map((nums) => caseFrom({ nums }, productExceptSelf(nums)))
    ]),
    statement: markdown(
      "Product of Array Except Self",
      "Return an array where each position contains the product of every value in `nums` except the value at that same position. Do not use division.",
      [
        "Input: nums = [2, 3, 4, 5]\nOutput: [60, 40, 30, 24]",
        "Input: nums = [-1, 1, 0, 3]\nOutput: [0, 0, -3, 0]",
        "Input: nums = [0, 4, 0]\nOutput: [0, 0, 0]"
      ],
      ["`2 <= len(nums) <= 100000`", "`-30 <= nums[i] <= 30`", "The final products fit in a 32-bit signed integer."],
      "Can you do it with constant extra space aside from the returned array?"
    ),
    editorial: "The product before each index and the product after each index are independent. Write prefix products into the result, then multiply by a suffix product while scanning backward.",
    solution: "```python\nclass Solution:\n    def productExceptSelf(self, nums):\n        result = [1] * len(nums)\n        prefix = 1\n        for i, value in enumerate(nums):\n            result[i] = prefix\n            prefix *= value\n        suffix = 1\n        for i in range(len(nums) - 1, -1, -1):\n            result[i] *= suffix\n            suffix *= nums[i]\n        return result\n```",
    hints: ["Think about the product strictly to the left of each index.", "A backward pass can add the product strictly to the right."],
    starter: "class Solution:\n    def productExceptSelf(self, nums):\n        pass"
  },
  {
    id: 7,
    slug: "valid-sudoku",
    title: "Valid Sudoku",
    difficulty: "Medium",
    tags: ["Array", "Hash Table", "Matrix"],
    method: "isValidSudoku",
    ...visibleFirst([
      sudokuCase(),
      sudokuCase((b) => { b[0][2] = "5"; return b; }),
      sudokuCase((b) => { b[2][0] = "6"; return b; }),
      sudokuCase((b) => { b[1][1] = "9"; return b; }),
      sudokuCase((b) => { b[8][0] = "5"; return b; }),
      sudokuCase((b) => { b[4][4] = "5"; return b; }),
      sudokuCase((b) => { b[0][0] = "."; return b; }),
      sudokuCase((b) => { b[0][0] = "."; b[8][8] = "."; return b; }),
      sudokuCase((b) => { b[0][1] = "6"; return b; }),
      sudokuCase((b) => { b[3][3] = "8"; return b; }),
      sudokuCase((b) => { b[6][6] = "2"; return b; }),
      sudokuCase((b) => { b[7][0] = "4"; return b; }),
      sudokuCase((b) => { b[0][3] = "1"; return b; }),
      sudokuCase((b) => { b[1][8] = "5"; return b; }),
      sudokuCase((b) => { b[2][2] = "."; return b; }),
      sudokuCase((b) => { b[5][5] = "2"; return b; }),
      sudokuCase((b) => { b[4][7] = "3"; return b; }),
      sudokuCase((b) => { b[8][8] = "8"; return b; }),
      sudokuCase((b) => { b[6][0] = "9"; return b; }),
      sudokuCase((b) => { b[2][3] = "8"; return b; }),
      sudokuCase((b) => { b[3][1] = "4"; return b; }),
      sudokuCase((b) => { b[0][8] = "7"; return b; }),
      sudokuCase((b) => { b[8][3] = "7"; return b; }),
      sudokuCase((b) => { b[6][3] = "6"; return b; }),
      sudokuCase((b) => { b[1][6] = "1"; return b; }),
      sudokuCase((b) => { b[3][6] = "8"; return b; }),
      sudokuCase((b) => { b[5][2] = "7"; return b; })
    ]),
    statement: markdown(
      "Valid Sudoku",
      "Given a partially filled 9 x 9 Sudoku board, return whether every filled cell obeys the Sudoku rules. Empty cells are represented by `.`. The board does not need to be solvable.",
      [
        "Input: board = partially filled board with no repeated row, column, or box values\nOutput: true",
        "Input: board = same board but row 0 contains two 5 values\nOutput: false",
        "Input: board = same board but column 0 contains two 6 values\nOutput: false"
      ],
      ["`board.length == 9`", "`board[i].length == 9`", "Each cell is `.` or a digit from `1` through `9`."]
    ),
    editorial: "Track every filled value in three scopes: row, column, and 3 x 3 box. If any scope sees the same digit twice, the board is invalid.",
    solution: "```python\nclass Solution:\n    def isValidSudoku(self, board):\n        seen = set()\n        for r in range(9):\n            for c in range(9):\n                value = board[r][c]\n                if value == '.':\n                    continue\n                row = ('row', r, value)\n                col = ('col', c, value)\n                box = ('box', r // 3, c // 3, value)\n                if row in seen or col in seen or box in seen:\n                    return False\n                seen.update([row, col, box])\n        return True\n```",
    hints: ["Check rows, columns, and boxes independently.", "A set can store a scoped marker such as `(row, index, digit)`."],
    starter: "class Solution:\n    def isValidSudoku(self, board):\n        pass"
  },
  {
    id: 8,
    slug: "encode-and-decode-strings",
    title: "Encode and Decode Strings",
    difficulty: "Medium",
    tags: ["Array", "String", "Design"],
    method: "encodeDecode",
    ...visibleFirst([
      caseFrom({ strs: ["lint", "code", "love", "you"] }, ["lint", "code", "love", "you"]),
      caseFrom({ strs: ["", "a", ""] }, ["", "a", ""]),
      caseFrom({ strs: ["12#x", "plain", "spaces ok"] }, ["12#x", "plain", "spaces ok"]),
      ...[
        [],
        [""],
        ["a"],
        ["hello", "world"],
        ["#", "##", "###"],
        ["0", "00", "000"],
        ["with space", "tabs not used"],
        ["comma,separated", "colon:value"],
        ["a".repeat(20), "b".repeat(15)],
        ["prefix#suffix", "10#ten"],
        ["", "", ""],
        ["abc", "", "def"],
        ["longer string with spaces", "short"],
        ["[]", "{}", "()"],
        ["slash/forward", "back\\\\slash"],
        ["line", "break", "not actual newline"],
        ["same", "same", "same"],
        ["case", "CASE"],
        ["123", "456", "789"],
        ["one", "two", "three", "four"],
        [" leading", "trailing "],
        ["mix1", "mix2", "mix3"],
        ["a#b#c", "###"],
        ["length:5", "value:hello"]
      ].map((strs) => caseFrom({ strs }, strs))
    ]),
    statement: markdown(
      "Encode and Decode Strings",
      "Design a reversible encoding for a list of strings. Implement `encode(strs)` and `decode(data)`. The judge calls `encodeDecode(strs)`, which should return `decode(encode(strs))`.",
      [
        "Input: strs = [\"lint\", \"code\", \"love\", \"you\"]\nOutput: [\"lint\", \"code\", \"love\", \"you\"]",
        "Input: strs = [\"\", \"a\", \"\"]\nOutput: [\"\", \"a\", \"\"]",
        "Input: strs = [\"12#x\", \"plain\", \"spaces ok\"]\nOutput: [\"12#x\", \"plain\", \"spaces ok\"]"
      ],
      ["`0 <= len(strs) <= 1000`", "`0 <= len(strs[i]) <= 1000`", "Strings may contain punctuation and spaces."]
    ),
    editorial: "A reliable encoding must include string boundaries. Prefix each string with its length and a delimiter, then read that many characters during decoding.",
    solution: "```python\nclass Solution:\n    def encode(self, strs):\n        return ''.join(f'{len(s)}#{s}' for s in strs)\n\n    def decode(self, data):\n        result = []\n        i = 0\n        while i < len(data):\n            j = data.index('#', i)\n            size = int(data[i:j])\n            start = j + 1\n            result.append(data[start:start + size])\n            i = start + size\n        return result\n\n    def encodeDecode(self, strs):\n        return self.decode(self.encode(strs))\n```",
    hints: ["Joining with a delimiter alone fails when strings contain that delimiter.", "Store each string length before its content."],
    starter: "class Solution:\n    def encode(self, strs):\n        pass\n\n    def decode(self, data):\n        pass\n\n    def encodeDecode(self, strs):\n        return self.decode(self.encode(strs))"
  },
  {
    id: 9,
    slug: "longest-consecutive-sequence",
    title: "Longest Consecutive Sequence",
    difficulty: "Medium",
    tags: ["Array", "Hash Set"],
    method: "longestConsecutive",
    ...visibleFirst([
      caseFrom({ nums: [100, 4, 200, 1, 3, 2] }, 4),
      caseFrom({ nums: [0, -1, 1, 2, -2] }, 5),
      caseFrom({ nums: [] }, 0),
      ...[
        [1],
        [1, 2, 0, 1],
        [9, 1, 4, 7, 3, -1, 0, 5, 8, -1, 6],
        [10, 30, 20],
        [-3, -2, -1, 0, 1],
        [5, 5, 5],
        [2, 3, 4, 10, 11, 12, 13],
        [50, 51, 52, 1, 2],
        [1000, 999, 998, 997],
        [8, 7, 6, 1, 2, 3, 4],
        [0, 0, -1],
        [14, 15, 16, 20, 21],
        [-10, -9, -8, 5, 6, 7, 8],
        [3, 1, 2],
        [30, 31, 32, 33, 34, 1],
        [1, 3, 5, 7],
        [11, 12, 13, 10, 9],
        [-1, -2, -3, -4],
        [4, 2, 1, 6, 5],
        [100, 101, 103, 104, 105],
        [2, 2, 3, 4, 4, 5],
        [99, 1, 2, 3, 4, 5, 100],
        Array.from({ length: 30 }, (_, i) => i + 20),
        [...Array.from({ length: 20 }, (_, i) => i * 2), 41, 42, 43, 44]
      ].map((nums) => caseFrom({ nums }, longestConsecutive(nums)))
    ]),
    statement: markdown(
      "Longest Consecutive Sequence",
      "Given an unsorted integer array, return the length of the longest run of values that appear consecutively. The numbers do not need to be adjacent in the original array.",
      [
        "Input: nums = [100, 4, 200, 1, 3, 2]\nOutput: 4",
        "Input: nums = [0, -1, 1, 2, -2]\nOutput: 5",
        "Input: nums = []\nOutput: 0"
      ],
      ["`0 <= len(nums) <= 100000`", "`-10^9 <= nums[i] <= 10^9`"],
      "Can you solve it in linear time?"
    ),
    editorial: "Put every number in a set. Only start counting from numbers that have no predecessor. Each sequence is then walked once, which makes the total work linear.",
    solution: "```python\nclass Solution:\n    def longestConsecutive(self, nums):\n        values = set(nums)\n        best = 0\n        for value in values:\n            if value - 1 in values:\n                continue\n            current = value\n            while current in values:\n                current += 1\n            best = max(best, current - value)\n        return best\n```",
    hints: ["Sorting is simple but costs `O(n log n)`.", "A number starts a sequence only if `number - 1` is absent."],
    starter: "class Solution:\n    def longestConsecutive(self, nums):\n        pass"
  }
];

for (const spec of problems) {
  expandCases(spec);
  writeProblem(spec);
}

console.log(`Generated ${problems.length} Arrays & Hashing problem packs.`);
