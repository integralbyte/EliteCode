import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const problemsRoot = path.join(root, "problems");
const TARGET_CASES = 45;

function writeProblem(spec) {
  const dir = path.join(problemsRoot, spec.slug);
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
  if (spec.checker) fs.writeFileSync(path.join(dir, "checker.py"), spec.checker.trimEnd() + "\n");
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

function fillCases(visible, seeds, maker, target = TARGET_CASES) {
  const cases = [...visible];
  let index = 0;
  while (cases.length < target) {
    cases.push(maker(seeds[index % seeds.length], index));
    index += 1;
  }
  return { visible: visible.length, cases };
}

function validPalindrome(s) {
  const chars = [...s.toLowerCase()].filter((ch) => /[a-z0-9]/.test(ch));
  for (let l = 0, r = chars.length - 1; l < r; l += 1, r -= 1) {
    if (chars[l] !== chars[r]) return false;
  }
  return true;
}

function twoSumSorted(numbers, target) {
  let l = 0;
  let r = numbers.length - 1;
  while (l < r) {
    const sum = numbers[l] + numbers[r];
    if (sum === target) return [l + 1, r + 1];
    if (sum < target) l += 1;
    else r -= 1;
  }
  return [];
}

function threeSum(nums) {
  const arr = [...nums].sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < arr.length - 2; i += 1) {
    if (i > 0 && arr[i] === arr[i - 1]) continue;
    let l = i + 1;
    let r = arr.length - 1;
    while (l < r) {
      const sum = arr[i] + arr[l] + arr[r];
      if (sum === 0) {
        result.push([arr[i], arr[l], arr[r]]);
        const left = arr[l];
        const right = arr[r];
        while (l < r && arr[l] === left) l += 1;
        while (l < r && arr[r] === right) r -= 1;
      } else if (sum < 0) l += 1;
      else r -= 1;
    }
  }
  return result;
}

function maxArea(height) {
  let best = 0;
  let l = 0;
  let r = height.length - 1;
  while (l < r) {
    best = Math.max(best, Math.min(height[l], height[r]) * (r - l));
    if (height[l] < height[r]) l += 1;
    else r -= 1;
  }
  return best;
}

function trap(height) {
  let l = 0, r = height.length - 1, leftMax = 0, rightMax = 0, water = 0;
  while (l < r) {
    if (height[l] <= height[r]) {
      leftMax = Math.max(leftMax, height[l]);
      water += leftMax - height[l];
      l += 1;
    } else {
      rightMax = Math.max(rightMax, height[r]);
      water += rightMax - height[r];
      r -= 1;
    }
  }
  return water;
}

function maxProfit(prices) {
  let low = Infinity;
  let best = 0;
  for (const price of prices) {
    low = Math.min(low, price);
    best = Math.max(best, price - low);
  }
  return best;
}

function longestSubstring(s) {
  const last = new Map();
  let left = 0;
  let best = 0;
  for (let right = 0; right < s.length; right += 1) {
    const ch = s[right];
    if (last.has(ch) && last.get(ch) >= left) left = last.get(ch) + 1;
    last.set(ch, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}

function charReplacement(s, k) {
  const counts = new Map();
  let left = 0, most = 0, best = 0;
  for (let right = 0; right < s.length; right += 1) {
    counts.set(s[right], (counts.get(s[right]) ?? 0) + 1);
    most = Math.max(most, counts.get(s[right]));
    while (right - left + 1 - most > k) {
      counts.set(s[left], counts.get(s[left]) - 1);
      left += 1;
    }
    best = Math.max(best, right - left + 1);
  }
  return best;
}

function checkInclusion(s1, s2) {
  const need = new Map();
  for (const ch of s1) need.set(ch, (need.get(ch) ?? 0) + 1);
  const window = new Map();
  const size = s1.length;
  for (let i = 0; i < s2.length; i += 1) {
    window.set(s2[i], (window.get(s2[i]) ?? 0) + 1);
    if (i >= size) {
      const old = s2[i - size];
      window.set(old, window.get(old) - 1);
      if (window.get(old) === 0) window.delete(old);
    }
    if (i >= size - 1 && mapsEqual(need, window)) return true;
  }
  return false;
}

function mapsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const [key, value] of a) if (b.get(key) !== value) return false;
  return true;
}

function minWindow(s, t) {
  if (!t) return "";
  const need = new Map();
  for (const ch of t) need.set(ch, (need.get(ch) ?? 0) + 1);
  const have = new Map();
  let formed = 0, left = 0, best = [Infinity, 0, 0];
  for (let right = 0; right < s.length; right += 1) {
    const ch = s[right];
    have.set(ch, (have.get(ch) ?? 0) + 1);
    if (need.has(ch) && have.get(ch) === need.get(ch)) formed += 1;
    while (formed === need.size) {
      if (right - left + 1 < best[0]) best = [right - left + 1, left, right + 1];
      const old = s[left];
      have.set(old, have.get(old) - 1);
      if (need.has(old) && have.get(old) < need.get(old)) formed -= 1;
      left += 1;
    }
  }
  return best[0] === Infinity ? "" : s.slice(best[1], best[2]);
}

function slidingMax(nums, k) {
  const deque = [];
  const out = [];
  for (let i = 0; i < nums.length; i += 1) {
    while (deque.length && deque[0] <= i - k) deque.shift();
    while (deque.length && nums[deque.at(-1)] <= nums[i]) deque.pop();
    deque.push(i);
    if (i >= k - 1) out.push(nums[deque[0]]);
  }
  return out;
}

function validParentheses(s) {
  const pairs = new Map([[")", "("], ["]", "["], ["}", "{"]]);
  const stack = [];
  for (const ch of s) {
    if (pairs.has(ch)) {
      if (stack.pop() !== pairs.get(ch)) return false;
    } else {
      stack.push(ch);
    }
  }
  return stack.length === 0;
}

function minStackRun(operations, values) {
  const stack = [];
  const mins = [];
  const out = [];
  for (let i = 0; i < operations.length; i += 1) {
    const op = operations[i];
    const value = values[i]?.[0];
    if (op === "MinStack") continue;
    if (op === "push") {
      stack.push(value);
      mins.push(mins.length ? Math.min(mins.at(-1), value) : value);
    } else if (op === "pop") {
      stack.pop();
      mins.pop();
    } else if (op === "top") out.push(stack.at(-1));
    else if (op === "getMin") out.push(mins.at(-1));
  }
  return out;
}

function evalRPN(tokens) {
  const stack = [];
  for (const token of tokens) {
    if (!["+", "-", "*", "/"].includes(token)) stack.push(Number(token));
    else {
      const b = stack.pop();
      const a = stack.pop();
      if (token === "+") stack.push(a + b);
      if (token === "-") stack.push(a - b);
      if (token === "*") stack.push(a * b);
      if (token === "/") stack.push(Math.trunc(a / b));
    }
  }
  return stack[0];
}

function generateParenthesis(n) {
  const out = [];
  function backtrack(current, open, close) {
    if (current.length === n * 2) {
      out.push(current);
      return;
    }
    if (open < n) backtrack(current + "(", open + 1, close);
    if (close < open) backtrack(current + ")", open, close + 1);
  }
  backtrack("", 0, 0);
  return out;
}

function dailyTemps(temperatures) {
  const out = Array(temperatures.length).fill(0);
  const stack = [];
  for (let i = 0; i < temperatures.length; i += 1) {
    while (stack.length && temperatures[i] > temperatures[stack.at(-1)]) {
      const prev = stack.pop();
      out[prev] = i - prev;
    }
    stack.push(i);
  }
  return out;
}

function carFleet(target, position, speed) {
  const cars = position.map((p, i) => [p, (target - p) / speed[i]]).sort((a, b) => b[0] - a[0]);
  let fleets = 0;
  let slowest = 0;
  for (const [, time] of cars) {
    if (time > slowest) {
      fleets += 1;
      slowest = time;
    }
  }
  return fleets;
}

function largestRectangle(heights) {
  const stack = [];
  let best = 0;
  const arr = [...heights, 0];
  for (let i = 0; i < arr.length; i += 1) {
    while (stack.length && arr[i] < arr[stack.at(-1)]) {
      const h = arr[stack.pop()];
      const left = stack.length ? stack.at(-1) : -1;
      best = Math.max(best, h * (i - left - 1));
    }
    stack.push(i);
  }
  return best;
}

function sortedArray(seed, n = 8) {
  const values = [];
  let current = -10 + (seed % 5);
  for (let i = 0; i < n; i += 1) {
    current += 1 + ((seed + i) % 4);
    values.push(current);
  }
  return values;
}

function patternedArray(seed, n = 9, mod = 12) {
  return Array.from({ length: n }, (_, i) => ((seed * 7 + i * 5) % mod) - Math.floor(mod / 3));
}

const tripletChecker = `
from __future__ import annotations

from typing import Any


def _normalise(value: Any) -> list[tuple[int, int, int]] | None:
    if not isinstance(value, list):
        return None
    result = []
    for triplet in value:
        if not isinstance(triplet, list) or len(triplet) != 3:
            return None
        if not all(isinstance(item, int) for item in triplet):
            return None
        result.append(tuple(sorted(triplet)))
    return sorted(set(result))


def check(input_data: dict[str, Any], expected: list[list[int]], actual: Any) -> dict[str, Any]:
    expected_norm = _normalise(expected)
    actual_norm = _normalise(actual)
    if actual_norm is None:
        return {"passed": False, "message": "Return a list of integer triplets."}
    return {"passed": actual_norm == expected_norm, "message": ""}
`;

const indexPairChecker = `
from __future__ import annotations

from typing import Any


def check(input_data: dict[str, Any], expected: list[int], actual: Any) -> dict[str, Any]:
    numbers = input_data["numbers"]
    target = input_data["target"]
    if not isinstance(actual, list) or len(actual) != 2 or not all(isinstance(index, int) for index in actual):
        return {"passed": False, "message": "Return two one-based indices."}
    left, right = actual
    if left == right or left < 1 or right < 1 or left > len(numbers) or right > len(numbers):
        return {"passed": False, "message": "Indices must be distinct and one-based."}
    if numbers[left - 1] + numbers[right - 1] != target:
        return {"passed": False, "message": "Selected values do not add to target."}
    return {"passed": True, "message": ""}
`;

const stringListChecker = `
from __future__ import annotations

from typing import Any


def check(input_data: dict[str, Any], expected: list[str], actual: Any) -> dict[str, Any]:
    if not isinstance(actual, list) or not all(isinstance(item, str) for item in actual):
        return {"passed": False, "message": "Return a list of strings."}
    return {"passed": sorted(actual) == sorted(expected), "message": ""}
`;

const minWindowChecker = `
from __future__ import annotations

from collections import Counter
from typing import Any


def check(input_data: dict[str, Any], expected: str, actual: Any) -> dict[str, Any]:
    if not isinstance(actual, str):
        return {"passed": False, "message": "Return a string."}
    if expected == "":
        return {"passed": actual == "", "message": ""}
    if len(actual) != len(expected) or actual not in input_data["s"]:
        return {"passed": False, "message": "Window has the wrong length or is not a substring."}
    need = Counter(input_data["t"])
    have = Counter(actual)
    ok = all(have[ch] >= count for ch, count in need.items())
    return {"passed": ok, "message": ""}
`;

const validPalindromeInputs = [
  "No lemon, no melon!",
  "Was it a car or a cat I saw?",
  "OpenAI",
  "",
  "a",
  "race a car",
  "Madam, I'm Adam",
  "12321",
  "1231",
  ".,,",
  "Never odd or even",
  "hello, olleh",
  "ab_a",
  "A man, a plan, a canal: Panama",
  "0P",
  "Step on no pets",
  "Not a palindrome",
  "Eva, can I see bees in a cave?",
  "abcddcba",
  "abcd dcba",
  "abc decba",
  "Top spot",
  "Borrow or rob?",
  "palindrome",
  "Level",
  "level up",
  "1001",
  "1002",
  "Red rum, sir, is murder",
  "rotavator",
  "rotatorx",
  "Do geese see God?",
  "My gym",
  "No x in Nixon",
  "A Santa at NASA",
  "This fails",
  "civic",
  "civil",
  "radar",
  "ra dar",
  "ab@#a",
  "ab@#c",
  "Able was I ere I saw Elba",
  "Doc, note: I dissent. A fast never prevents a fatness. I diet on cod.",
  "short"
];

const simpleStrings = ["abcabcbb", "bbbbb", "pwwkew", "", "au", "dvdf", "abba", "tmmzuxt", "abcdef", "aab", "anviaj", "ohvhjdml", "abcadeafg", "zzzzzz", "longest", "qrsvbspk", "aabaab!bb", "12345123", "abcdefga", "nfpdmpi", "wobgrovw", "a".repeat(20), "ab".repeat(12), "abcd".repeat(8), "thequickbrownfox", "abbaacdef", "xyzxyza", "dvdfxyz", "abc def", "space bar", "caseCASE", "AaBbCc", "mississippi", "subdermatoglyphic", "redivider", "algorithm", "datastructures", "slidingwindow", "hashmap", "queue", "stack", "monotonic", "window", "repeat", "unique"];

const problems = [
  {
    id: 10,
    slug: "valid-palindrome",
    title: "Valid Palindrome",
    difficulty: "Easy",
    tags: ["Two Pointers", "String"],
    method: "isPalindrome",
    ...fillCases(
      [
        caseFrom({ s: "No lemon, no melon!" }, true),
        caseFrom({ s: "Was it a car or a cat I saw?" }, true),
        caseFrom({ s: "OpenAI" }, false)
      ],
      validPalindromeInputs,
      (s) => caseFrom({ s }, validPalindrome(s))
    ),
    statement: markdown("Valid Palindrome", "Return whether `s` reads the same forward and backward after ignoring punctuation, spaces, and letter case.", ["Input: s = \"No lemon, no melon!\"\nOutput: true", "Input: s = \"Was it a car or a cat I saw?\"\nOutput: true", "Input: s = \"OpenAI\"\nOutput: false"], ["`0 <= len(s) <= 200000`", "`s` may contain printable ASCII characters."]),
    editorial: "Move one pointer from each end. Skip non-alphanumeric characters and compare lowercase characters when both pointers land on valid characters.",
    solution: "```python\nclass Solution:\n    def isPalindrome(self, s):\n        left, right = 0, len(s) - 1\n        while left < right:\n            while left < right and not s[left].isalnum():\n                left += 1\n            while left < right and not s[right].isalnum():\n                right -= 1\n            if s[left].lower() != s[right].lower():\n                return False\n            left += 1\n            right -= 1\n        return True\n```",
    hints: ["Ignore characters that do not affect the comparison.", "Use two pointers instead of building every possible cleaned string."],
    starter: "class Solution:\n    def isPalindrome(self, s):\n        pass"
  },
  {
    id: 11,
    slug: "two-sum-ii-input-array-is-sorted",
    title: "Two Sum II - Input Array Is Sorted",
    difficulty: "Medium",
    tags: ["Two Pointers", "Array"],
    method: "twoSum",
    checker: indexPairChecker,
    ...fillCases(
      [
        caseFrom({ numbers: [1, 4, 6, 10, 13], target: 16 }, [3, 4]),
        caseFrom({ numbers: [-8, -3, 2, 5, 9], target: 1 }, [2, 3]),
        caseFrom({ numbers: [2, 7], target: 9 }, [1, 2])
      ],
      Array.from({ length: 42 }, (_, i) => i + 1),
      (seed) => {
        const numbers = sortedArray(seed, 7 + (seed % 5));
        const i = seed % Math.floor(numbers.length / 2);
        const j = numbers.length - 1 - (seed % Math.floor(numbers.length / 3));
        return caseFrom({ numbers, target: numbers[i] + numbers[j] }, twoSumSorted(numbers, numbers[i] + numbers[j]));
      }
    ),
    statement: markdown("Two Sum II - Input Array Is Sorted", "Given a nondecreasing array `numbers`, return one-based indices of two different values that add to `target`.", ["Input: numbers = [1, 4, 6, 10, 13], target = 16\nOutput: [3, 4]", "Input: numbers = [-8, -3, 2, 5, 9], target = 1\nOutput: [2, 3]", "Input: numbers = [2, 7], target = 9\nOutput: [1, 2]"], ["`2 <= len(numbers) <= 30000`", "Exactly one valid pair exists."], "Use the sorted order directly."),
    editorial: "Start with pointers at both ends. If the sum is too small, move the left pointer right. If the sum is too large, move the right pointer left.",
    solution: "```python\nclass Solution:\n    def twoSum(self, numbers, target):\n        left, right = 0, len(numbers) - 1\n        while left < right:\n            total = numbers[left] + numbers[right]\n            if total == target:\n                return [left + 1, right + 1]\n            if total < target:\n                left += 1\n            else:\n                right -= 1\n```",
    hints: ["The smallest remaining value is on the left.", "The largest remaining value is on the right."],
    starter: "class Solution:\n    def twoSum(self, numbers, target):\n        pass"
  },
  {
    id: 12,
    slug: "3sum",
    title: "3Sum",
    difficulty: "Medium",
    tags: ["Two Pointers", "Array", "Sorting"],
    method: "threeSum",
    checker: tripletChecker,
    ...fillCases(
      [
        caseFrom({ nums: [-4, -1, -1, 0, 1, 2] }, [[-1, -1, 2], [-1, 0, 1]]),
        caseFrom({ nums: [0, 0, 0, 0] }, [[0, 0, 0]]),
        caseFrom({ nums: [1, 2, -2, -1] }, [])
      ],
      Array.from({ length: 42 }, (_, i) => i + 1),
      (seed) => {
        const nums = patternedArray(seed, 8 + (seed % 5), 15);
        nums.push(-nums[0] - nums[1]);
        return caseFrom({ nums }, threeSum(nums));
      }
    ),
    statement: markdown("3Sum", "Return all unique triplets of values in `nums` whose sum is zero. The order of triplets does not matter.", ["Input: nums = [-4, -1, -1, 0, 1, 2]\nOutput: [[-1, -1, 2], [-1, 0, 1]]", "Input: nums = [0, 0, 0, 0]\nOutput: [[0, 0, 0]]", "Input: nums = [1, 2, -2, -1]\nOutput: []"], ["`0 <= len(nums) <= 3000`", "`-10^5 <= nums[i] <= 10^5`"]),
    editorial: "Sort the array. Fix one value, then solve the remaining two-value search with two pointers while skipping duplicates.",
    solution: "```python\nclass Solution:\n    def threeSum(self, nums):\n        nums.sort()\n        result = []\n        for i, value in enumerate(nums):\n            if i and value == nums[i - 1]:\n                continue\n            left, right = i + 1, len(nums) - 1\n            while left < right:\n                total = value + nums[left] + nums[right]\n                if total == 0:\n                    result.append([value, nums[left], nums[right]])\n                    left += 1\n                    right -= 1\n                    while left < right and nums[left] == nums[left - 1]:\n                        left += 1\n                    while left < right and nums[right] == nums[right + 1]:\n                        right -= 1\n                elif total < 0:\n                    left += 1\n                else:\n                    right -= 1\n        return result\n```",
    hints: ["Sorting makes duplicate handling and two-pointer movement easier.", "After fixing one value, the target for the other two is its negation."],
    starter: "class Solution:\n    def threeSum(self, nums):\n        pass"
  },
  {
    id: 13,
    slug: "container-with-most-water",
    title: "Container With Most Water",
    difficulty: "Medium",
    tags: ["Two Pointers", "Array"],
    method: "maxArea",
    ...fillCases(
      [
        caseFrom({ height: [1, 8, 6, 2, 5, 4, 8, 3, 7] }, 49),
        caseFrom({ height: [5, 5] }, 5),
        caseFrom({ height: [1, 2, 3, 4, 5] }, 6)
      ],
      Array.from({ length: 42 }, (_, i) => i + 2),
      (seed) => {
        const height = Array.from({ length: 3 + (seed % 12) }, (_, i) => 1 + ((seed * 3 + i * 7) % 17));
        return caseFrom({ height }, maxArea(height));
      }
    ),
    statement: markdown("Container With Most Water", "Given vertical line heights, choose two lines that together with the x-axis hold the largest possible area.", ["Input: height = [1, 8, 6, 2, 5, 4, 8, 3, 7]\nOutput: 49", "Input: height = [5, 5]\nOutput: 5", "Input: height = [1, 2, 3, 4, 5]\nOutput: 6"], ["`2 <= len(height) <= 100000`", "`0 <= height[i] <= 10000`"]),
    editorial: "The area is limited by the shorter side. Start wide, then move the pointer at the shorter side because keeping it cannot improve future areas.",
    solution: "```python\nclass Solution:\n    def maxArea(self, height):\n        left, right = 0, len(height) - 1\n        best = 0\n        while left < right:\n            best = max(best, min(height[left], height[right]) * (right - left))\n            if height[left] < height[right]:\n                left += 1\n            else:\n                right -= 1\n        return best\n```",
    hints: ["Width shrinks every move, so the only possible improvement is a taller limiting wall.", "Move away from the shorter side."],
    starter: "class Solution:\n    def maxArea(self, height):\n        pass"
  },
  {
    id: 14,
    slug: "trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "Hard",
    tags: ["Two Pointers", "Array"],
    method: "trap",
    ...fillCases(
      [
        caseFrom({ height: [0, 3, 0, 2, 0, 4] }, 7),
        caseFrom({ height: [4, 2, 0, 3, 2, 5] }, 9),
        caseFrom({ height: [1, 2, 3] }, 0)
      ],
      Array.from({ length: 42 }, (_, i) => i + 1),
      (seed) => {
        const height = Array.from({ length: 3 + (seed % 14) }, (_, i) => (seed * 5 + i * i + 3) % 9);
        return caseFrom({ height }, trap(height));
      }
    ),
    statement: markdown("Trapping Rain Water", "Given bar heights, compute how many units of rain water remain trapped after raining.", ["Input: height = [0, 3, 0, 2, 0, 4]\nOutput: 7", "Input: height = [4, 2, 0, 3, 2, 5]\nOutput: 9", "Input: height = [1, 2, 3]\nOutput: 0"], ["`0 <= len(height) <= 100000`", "`0 <= height[i] <= 100000`"]),
    editorial: "Water above an index is limited by the smaller of the best wall to its left and right. A two-pointer scan can maintain those limits without storing arrays.",
    solution: "```python\nclass Solution:\n    def trap(self, height):\n        left, right = 0, len(height) - 1\n        left_max = right_max = 0\n        water = 0\n        while left < right:\n            if height[left] <= height[right]:\n                left_max = max(left_max, height[left])\n                water += left_max - height[left]\n                left += 1\n            else:\n                right_max = max(right_max, height[right])\n                water += right_max - height[right]\n                right -= 1\n        return water\n```",
    hints: ["A bar needs a taller wall on both sides to hold water.", "The smaller side determines the current safe water level."],
    starter: "class Solution:\n    def trap(self, height):\n        pass"
  }
];

const slidingProblems = [
  {
    id: 15,
    slug: "best-time-to-buy-and-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    difficulty: "Easy",
    tags: ["Sliding Window", "Array"],
    method: "maxProfit",
    algorithm: maxProfit,
    visible: [[7, 1, 5, 3, 6, 4], [7, 6, 4, 3, 1], [2, 4, 1]],
    statement: ["Return the largest profit from one buy followed by one later sell. If no profitable trade exists, return 0.", "Input: prices = [7, 1, 5, 3, 6, 4]\nOutput: 5", "Input: prices = [7, 6, 4, 3, 1]\nOutput: 0", "Input: prices = [2, 4, 1]\nOutput: 2"],
    solution: "```python\nclass Solution:\n    def maxProfit(self, prices):\n        low = float('inf')\n        best = 0\n        for price in prices:\n            low = min(low, price)\n            best = max(best, price - low)\n        return best\n```",
    starter: "class Solution:\n    def maxProfit(self, prices):\n        pass",
    inputName: "prices"
  },
  {
    id: 16,
    slug: "longest-substring-without-repeating-characters",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    tags: ["Sliding Window", "Hash Table", "String"],
    method: "lengthOfLongestSubstring",
    algorithm: longestSubstring,
    visible: ["abcabcbb", "bbbbb", "pwwkew"],
    statement: ["Return the length of the longest contiguous substring that contains no repeated characters.", "Input: s = \"abcabcbb\"\nOutput: 3", "Input: s = \"bbbbb\"\nOutput: 1", "Input: s = \"pwwkew\"\nOutput: 3"],
    solution: "```python\nclass Solution:\n    def lengthOfLongestSubstring(self, s):\n        last = {}\n        left = 0\n        best = 0\n        for right, ch in enumerate(s):\n            if ch in last and last[ch] >= left:\n                left = last[ch] + 1\n            last[ch] = right\n            best = max(best, right - left + 1)\n        return best\n```",
    starter: "class Solution:\n    def lengthOfLongestSubstring(self, s):\n        pass",
    inputName: "s",
    stringSeeds: simpleStrings
  },
  {
    id: 17,
    slug: "longest-repeating-character-replacement",
    title: "Longest Repeating Character Replacement",
    difficulty: "Medium",
    tags: ["Sliding Window", "String"],
    method: "characterReplacement",
    visible: [["AABABBA", 1], ["ABAB", 2], ["ABCDE", 1]],
    statement: ["Given an uppercase string `s`, you may change at most `k` characters. Return the longest substring that can be made of one repeated character.", "Input: s = \"AABABBA\", k = 1\nOutput: 4", "Input: s = \"ABAB\", k = 2\nOutput: 4", "Input: s = \"ABCDE\", k = 1\nOutput: 2"],
    solution: "```python\nfrom collections import defaultdict\n\nclass Solution:\n    def characterReplacement(self, s, k):\n        counts = defaultdict(int)\n        left = 0\n        most = 0\n        best = 0\n        for right, ch in enumerate(s):\n            counts[ch] += 1\n            most = max(most, counts[ch])\n            while right - left + 1 - most > k:\n                counts[s[left]] -= 1\n                left += 1\n            best = max(best, right - left + 1)\n        return best\n```",
    starter: "class Solution:\n    def characterReplacement(self, s, k):\n        pass"
  },
  {
    id: 18,
    slug: "permutation-in-string",
    title: "Permutation in String",
    difficulty: "Medium",
    tags: ["Sliding Window", "Hash Table", "String"],
    method: "checkInclusion",
    visible: [["ab", "eidbaooo"], ["ab", "eidboaoo"], ["adc", "dcda"]],
    statement: ["Return whether any permutation of `s1` appears as a contiguous substring of `s2`.", "Input: s1 = \"ab\", s2 = \"eidbaooo\"\nOutput: true", "Input: s1 = \"ab\", s2 = \"eidboaoo\"\nOutput: false", "Input: s1 = \"adc\", s2 = \"dcda\"\nOutput: true"],
    solution: "```python\nfrom collections import Counter\n\nclass Solution:\n    def checkInclusion(self, s1, s2):\n        need = Counter(s1)\n        window = Counter()\n        size = len(s1)\n        for i, ch in enumerate(s2):\n            window[ch] += 1\n            if i >= size:\n                old = s2[i - size]\n                window[old] -= 1\n                if window[old] == 0:\n                    del window[old]\n            if i >= size - 1 and window == need:\n                return True\n        return False\n```",
    starter: "class Solution:\n    def checkInclusion(self, s1, s2):\n        pass"
  },
  {
    id: 19,
    slug: "minimum-window-substring",
    title: "Minimum Window Substring",
    difficulty: "Hard",
    tags: ["Sliding Window", "Hash Table", "String"],
    method: "minWindow",
    checker: minWindowChecker,
    visible: [["ADOBECODEBANC", "ABC"], ["a", "a"], ["a", "aa"]],
    statement: ["Return the shortest substring of `s` containing every character of `t`, including duplicate requirements. Return an empty string if no such window exists.", "Input: s = \"ADOBECODEBANC\", t = \"ABC\"\nOutput: \"BANC\"", "Input: s = \"a\", t = \"a\"\nOutput: \"a\"", "Input: s = \"a\", t = \"aa\"\nOutput: \"\""],
    solution: "```python\nfrom collections import Counter, defaultdict\n\nclass Solution:\n    def minWindow(self, s, t):\n        if not t:\n            return ''\n        need = Counter(t)\n        have = defaultdict(int)\n        formed = 0\n        left = 0\n        best = (float('inf'), 0, 0)\n        for right, ch in enumerate(s):\n            have[ch] += 1\n            if ch in need and have[ch] == need[ch]:\n                formed += 1\n            while formed == len(need):\n                if right - left + 1 < best[0]:\n                    best = (right - left + 1, left, right + 1)\n                old = s[left]\n                have[old] -= 1\n                if old in need and have[old] < need[old]:\n                    formed -= 1\n                left += 1\n        return '' if best[0] == float('inf') else s[best[1]:best[2]]\n```",
    starter: "class Solution:\n    def minWindow(self, s, t):\n        pass"
  },
  {
    id: 20,
    slug: "sliding-window-maximum",
    title: "Sliding Window Maximum",
    difficulty: "Hard",
    tags: ["Sliding Window", "Deque"],
    method: "maxSlidingWindow",
    visible: [[[1, 3, -1, -3, 5, 3, 6, 7], 3], [[1], 1], [[9, 8, 7, 6], 2]],
    statement: ["For every contiguous window of size `k`, return the largest value inside that window.", "Input: nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3\nOutput: [3, 3, 5, 5, 6, 7]", "Input: nums = [1], k = 1\nOutput: [1]", "Input: nums = [9, 8, 7, 6], k = 2\nOutput: [9, 8, 7]"],
    solution: "```python\nfrom collections import deque\n\nclass Solution:\n    def maxSlidingWindow(self, nums, k):\n        q = deque()\n        result = []\n        for i, value in enumerate(nums):\n            while q and q[0] <= i - k:\n                q.popleft()\n            while q and nums[q[-1]] <= value:\n                q.pop()\n            q.append(i)\n            if i >= k - 1:\n                result.append(nums[q[0]])\n        return result\n```",
    starter: "class Solution:\n    def maxSlidingWindow(self, nums, k):\n        pass"
  }
];

for (const spec of slidingProblems) {
  let cases;
  if (spec.id === 15) {
    cases = fillCases(spec.visible.map((prices) => caseFrom({ prices }, maxProfit(prices))), Array.from({ length: 42 }, (_, i) => i), (seed) => {
      const prices = Array.from({ length: 2 + (seed % 12) }, (_, i) => 1 + ((seed * 11 + i * 7 + i * i) % 40));
      return caseFrom({ prices }, maxProfit(prices));
    });
  } else if (spec.id === 16) {
    cases = fillCases(spec.visible.map((s) => caseFrom({ s }, longestSubstring(s))), spec.stringSeeds, (s) => caseFrom({ s }, longestSubstring(s)));
  } else if (spec.id === 17) {
    cases = fillCases(spec.visible.map(([s, k]) => caseFrom({ s, k }, charReplacement(s, k))), Array.from({ length: 42 }, (_, i) => i), (seed) => {
      const letters = "AABBCDE";
      const s = Array.from({ length: 4 + (seed % 18) }, (_, i) => letters[(seed + i * 3) % letters.length]).join("");
      const k = seed % 4;
      return caseFrom({ s, k }, charReplacement(s, k));
    });
  } else if (spec.id === 18) {
    cases = fillCases(spec.visible.map(([s1, s2]) => caseFrom({ s1, s2 }, checkInclusion(s1, s2))), Array.from({ length: 42 }, (_, i) => i), (seed) => {
      const pool = ["ab", "abc", "aabc", "xyz", "adc", "hello", "roof"];
      const s1 = pool[seed % pool.length];
      const s2 = seed % 3 === 0 ? `zz${[...s1].reverse().join("")}yy` : `${pool[(seed + 2) % pool.length]}${seed}q`;
      return caseFrom({ s1, s2 }, checkInclusion(s1, s2));
    });
  } else if (spec.id === 19) {
    const seeds = [["thisisateststring", "tist"], ["figehaeci", "aei"], ["abcdef", "z"], ["aaabdabcefaecbef", "abc"], ["bba", "ab"], ["cabwefgewcwaefgcf", "cae"], ["abc", "abc"], ["abc", "abcd"]];
    cases = fillCases(spec.visible.map(([s, t]) => caseFrom({ s, t }, minWindow(s, t))), seeds, ([s, t]) => caseFrom({ s, t }, minWindow(s, t)));
  } else {
    cases = fillCases(spec.visible.map(([nums, k]) => caseFrom({ nums, k }, slidingMax(nums, k))), Array.from({ length: 42 }, (_, i) => i), (seed) => {
      const nums = patternedArray(seed, 5 + (seed % 12), 31);
      const k = 1 + (seed % nums.length);
      return caseFrom({ nums, k }, slidingMax(nums, k));
    });
  }
  problems.push({
    id: spec.id,
    slug: spec.slug,
    title: spec.title,
    difficulty: spec.difficulty,
    tags: spec.tags,
    method: spec.method,
    checker: spec.checker,
    ...cases,
    statement: markdown(spec.title, spec.statement[0], spec.statement.slice(1), ["Input sizes follow the original interview-style constraints.", "Return values must match the described behavior."]),
    editorial: "Maintain only the state needed for the current window or scan. Move the left boundary when the current state violates the target condition.",
    solution: spec.solution,
    hints: ["Ask what information changes when the right edge moves.", "Shrink the left edge only when the window no longer satisfies the condition."],
    starter: spec.starter
  });
}

const stackSpecs = [
  {
    id: 21,
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "Easy",
    tags: ["Stack", "String"],
    method: "isValid",
    visible: ["()[]{}", "([{}])", "(]"],
    algorithm: validParentheses,
    statement: ["Return whether every opening bracket in `s` is closed by the same type of bracket in the correct order.", "Input: s = \"()[]{}\"\nOutput: true", "Input: s = \"([{}])\"\nOutput: true", "Input: s = \"(]\"\nOutput: false"],
    solution: "```python\nclass Solution:\n    def isValid(self, s):\n        pairs = {')': '(', ']': '[', '}': '{'}\n        stack = []\n        for ch in s:\n            if ch in pairs:\n                if not stack or stack.pop() != pairs[ch]:\n                    return False\n            else:\n                stack.append(ch)\n        return not stack\n```",
    starter: "class Solution:\n    def isValid(self, s):\n        pass"
  },
  {
    id: 22,
    slug: "min-stack",
    title: "Min Stack",
    difficulty: "Medium",
    tags: ["Stack", "Design"],
    method: "minStack",
    visible: [
      [["MinStack", "push", "push", "push", "getMin", "pop", "top", "getMin"], [[], [-2], [0], [-3], [], [], [], []]],
      [["MinStack", "push", "push", "getMin", "top"], [[], [5], [1], [], []]],
      [["MinStack", "push", "getMin", "push", "getMin"], [[], [2], [], [1], []]]
    ],
    statement: ["Implement stack behavior that can also report the current minimum in constant time. The judge calls `minStack(operations, values)` and expects outputs from `top` and `getMin` only.", "Input: operations = [MinStack, push, push, push, getMin, pop, top, getMin]\nOutput: [-3, 0, -2]", "Input: operations = [MinStack, push, push, getMin, top]\nOutput: [1, 1]", "Input: operations = [MinStack, push, getMin, push, getMin]\nOutput: [2, 1]"],
    solution: "```python\nclass MinStack:\n    def __init__(self):\n        self.stack = []\n        self.mins = []\n\n    def push(self, val):\n        self.stack.append(val)\n        self.mins.append(val if not self.mins else min(val, self.mins[-1]))\n\n    def pop(self):\n        self.stack.pop()\n        self.mins.pop()\n\n    def top(self):\n        return self.stack[-1]\n\n    def getMin(self):\n        return self.mins[-1]\n\nclass Solution:\n    def minStack(self, operations, values):\n        obj = None\n        out = []\n        for op, args in zip(operations, values):\n            if op == 'MinStack':\n                obj = MinStack()\n            elif op == 'push':\n                obj.push(args[0])\n            elif op == 'pop':\n                obj.pop()\n            elif op == 'top':\n                out.append(obj.top())\n            elif op == 'getMin':\n                out.append(obj.getMin())\n        return out\n```",
    starter: "class MinStack:\n    def __init__(self):\n        pass\n\n    def push(self, val):\n        pass\n\n    def pop(self):\n        pass\n\n    def top(self):\n        pass\n\n    def getMin(self):\n        pass\n\nclass Solution:\n    def minStack(self, operations, values):\n        pass"
  },
  {
    id: 23,
    slug: "evaluate-reverse-polish-notation",
    title: "Evaluate Reverse Polish Notation",
    difficulty: "Medium",
    tags: ["Stack", "Math"],
    method: "evalRPN",
    visible: [["2", "1", "+", "3", "*"], ["4", "13", "5", "/", "+"], ["10", "6", "9", "3", "+", "-11", "*", "/", "*", "17", "+", "5", "+"]],
    algorithm: evalRPN,
    statement: ["Evaluate an arithmetic expression written in Reverse Polish Notation. Division truncates toward zero.", "Input: tokens = [\"2\", \"1\", \"+\", \"3\", \"*\"]\nOutput: 9", "Input: tokens = [\"4\", \"13\", \"5\", \"/\", \"+\"]\nOutput: 6", "Input: tokens = [\"10\", \"6\", \"9\", \"3\", \"+\", \"-11\", \"*\", \"/\", \"*\", \"17\", \"+\", \"5\", \"+\"]\nOutput: 22"],
    solution: "```python\nclass Solution:\n    def evalRPN(self, tokens):\n        stack = []\n        for token in tokens:\n            if token not in '+-*/':\n                stack.append(int(token))\n                continue\n            b = stack.pop()\n            a = stack.pop()\n            if token == '+':\n                stack.append(a + b)\n            elif token == '-':\n                stack.append(a - b)\n            elif token == '*':\n                stack.append(a * b)\n            else:\n                stack.append(int(a / b))\n        return stack[-1]\n```",
    starter: "class Solution:\n    def evalRPN(self, tokens):\n        pass"
  },
  {
    id: 24,
    slug: "generate-parentheses",
    title: "Generate Parentheses",
    difficulty: "Medium",
    tags: ["Stack", "Backtracking"],
    method: "generateParenthesis",
    checker: stringListChecker,
    visible: [1, 2, 3],
    algorithm: generateParenthesis,
    statement: ["Generate every valid string containing `n` pairs of parentheses.", "Input: n = 1\nOutput: [\"()\"]", "Input: n = 2\nOutput: [\"(())\", \"()()\"]", "Input: n = 3\nOutput: [\"((()))\", \"(()())\", \"(())()\", \"()(())\", \"()()()\"]"],
    solution: "```python\nclass Solution:\n    def generateParenthesis(self, n):\n        result = []\n        def backtrack(current, open_count, close_count):\n            if len(current) == 2 * n:\n                result.append(current)\n                return\n            if open_count < n:\n                backtrack(current + '(', open_count + 1, close_count)\n            if close_count < open_count:\n                backtrack(current + ')', open_count, close_count + 1)\n        backtrack('', 0, 0)\n        return result\n```",
    starter: "class Solution:\n    def generateParenthesis(self, n):\n        pass"
  },
  {
    id: 25,
    slug: "daily-temperatures",
    title: "Daily Temperatures",
    difficulty: "Medium",
    tags: ["Stack", "Monotonic Stack"],
    method: "dailyTemperatures",
    visible: [[73, 74, 75, 71, 69, 72, 76, 73], [30, 40, 50, 60], [60, 50, 40]],
    algorithm: dailyTemps,
    statement: ["For each day, return how many days must pass before a warmer temperature appears. Use 0 when none appears.", "Input: temperatures = [73, 74, 75, 71, 69, 72, 76, 73]\nOutput: [1, 1, 4, 2, 1, 1, 0, 0]", "Input: temperatures = [30, 40, 50, 60]\nOutput: [1, 1, 1, 0]", "Input: temperatures = [60, 50, 40]\nOutput: [0, 0, 0]"],
    solution: "```python\nclass Solution:\n    def dailyTemperatures(self, temperatures):\n        result = [0] * len(temperatures)\n        stack = []\n        for i, temp in enumerate(temperatures):\n            while stack and temp > temperatures[stack[-1]]:\n                prev = stack.pop()\n                result[prev] = i - prev\n            stack.append(i)\n        return result\n```",
    starter: "class Solution:\n    def dailyTemperatures(self, temperatures):\n        pass"
  },
  {
    id: 26,
    slug: "car-fleet",
    title: "Car Fleet",
    difficulty: "Medium",
    tags: ["Stack", "Sorting"],
    method: "carFleet",
    visible: [[[12, [10, 8, 0, 5, 3], [2, 4, 1, 1, 3]]], [[10, [3], [3]]], [[100, [0, 2, 4], [4, 2, 1]]]],
    statement: ["Cars drive toward `target`. A faster car that catches a slower car becomes part of that slower fleet. Return the number of fleets that arrive.", "Input: target = 12, position = [10, 8, 0, 5, 3], speed = [2, 4, 1, 1, 3]\nOutput: 3", "Input: target = 10, position = [3], speed = [3]\nOutput: 1", "Input: target = 100, position = [0, 2, 4], speed = [4, 2, 1]\nOutput: 1"],
    solution: "```python\nclass Solution:\n    def carFleet(self, target, position, speed):\n        cars = sorted(zip(position, speed), reverse=True)\n        fleets = 0\n        slowest = 0\n        for pos, spd in cars:\n            time = (target - pos) / spd\n            if time > slowest:\n                fleets += 1\n                slowest = time\n        return fleets\n```",
    starter: "class Solution:\n    def carFleet(self, target, position, speed):\n        pass"
  },
  {
    id: 27,
    slug: "largest-rectangle-in-histogram",
    title: "Largest Rectangle in Histogram",
    difficulty: "Hard",
    tags: ["Stack", "Monotonic Stack"],
    method: "largestRectangleArea",
    visible: [[2, 1, 5, 6, 2, 3], [2, 4], [5, 4, 3, 2, 1]],
    algorithm: largestRectangle,
    statement: ["Given bar heights in a histogram, return the area of the largest rectangle that can be formed by adjacent bars.", "Input: heights = [2, 1, 5, 6, 2, 3]\nOutput: 10", "Input: heights = [2, 4]\nOutput: 4", "Input: heights = [5, 4, 3, 2, 1]\nOutput: 9"],
    solution: "```python\nclass Solution:\n    def largestRectangleArea(self, heights):\n        stack = []\n        best = 0\n        for i, height in enumerate(heights + [0]):\n            while stack and height < heights[stack[-1]]:\n                h = heights[stack.pop()]\n                left = stack[-1] if stack else -1\n                best = max(best, h * (i - left - 1))\n            stack.append(i)\n        return best\n```",
    starter: "class Solution:\n    def largestRectangleArea(self, heights):\n        pass"
  }
];

for (const spec of stackSpecs) {
  let cases;
  if (spec.id === 21) {
    const seeds = ["", "()", "([])", "([)]", "{[]}", "(((", ")))", "({[]})", "({[}])", "()()[]{}", "(([]){})", "([{}]){}", "{[()]}", "{[(])}", "[]{}()", "([)", "([]{})", "{", "}", "((((()))))", "()(()", "(()())", "([{}{}])", "([{}])(", "(((())))[]", "([[[[]]]])", "([{}])[]{}", "[(])", "((())", "())(()", "{[()()]}", "{[(])}", "[]", "{}", "({})", "({)}", "()[{}]", "([{}])([{}])", "(((((", "}}}}", "{[({})]}", "{[({})]}()", "([]){}(([]))", "([{}]))", "(()(()))"];
    cases = fillCases(spec.visible.map((s) => caseFrom({ s }, validParentheses(s))), seeds, (s) => caseFrom({ s }, validParentheses(s)));
  } else if (spec.id === 22) {
    const seeds = Array.from({ length: 42 }, (_, seed) => {
      const operations = ["MinStack"];
      const values = [[]];
      let depth = 0;
      for (let i = 0; i < 8 + (seed % 5); i += 1) {
        const value = ((seed * 7 + i * 3) % 25) - 12;
        operations.push("push"); values.push([value]); depth += 1;
        if (i % 2 === 0) { operations.push("getMin"); values.push([]); }
        if (i % 3 === 0) { operations.push("top"); values.push([]); }
        if (depth > 2 && i % 4 === 0) { operations.push("pop"); values.push([]); depth -= 1; }
      }
      operations.push("getMin"); values.push([]);
      operations.push("top"); values.push([]);
      return [operations, values];
    });
    cases = fillCases(spec.visible.map(([operations, values]) => caseFrom({ operations, values }, minStackRun(operations, values))), seeds, ([operations, values]) => caseFrom({ operations, values }, minStackRun(operations, values)));
  } else if (spec.id === 23) {
    const seeds = [["3", "4", "+"], ["5", "1", "2", "+", "4", "*", "+", "3", "-"], ["18", "3", "/"], ["7", "3", "/"], ["-7", "3", "/"], ["2", "3", "11", "+", "5", "-", "*"], ["4", "2", "+", "3", "5", "1", "-", "*", "+"], ["9", "2", "*", "3", "/"], ["8", "3", "-", "2", "*"], ["6", "2", "/", "3", "+"], ["10", "2", "8", "*", "+", "3", "-"], ["1", "2", "+", "3", "4", "+", "*"]];
    cases = fillCases(spec.visible.map((tokens) => caseFrom({ tokens }, evalRPN(tokens))), seeds, (tokens) => caseFrom({ tokens }, evalRPN(tokens)));
  } else if (spec.id === 24) {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    cases = fillCases(spec.visible.map((n) => caseFrom({ n }, generateParenthesis(n))), seeds, (n) => caseFrom({ n }, generateParenthesis(n)), 18);
  } else if (spec.id === 25) {
    cases = fillCases(spec.visible.map((temperatures) => caseFrom({ temperatures }, dailyTemps(temperatures))), Array.from({ length: 42 }, (_, i) => i), (seed) => {
      const temperatures = Array.from({ length: 1 + (seed % 16) }, (_, i) => 30 + ((seed * 7 + i * i + i) % 70));
      return caseFrom({ temperatures }, dailyTemps(temperatures));
    });
  } else if (spec.id === 26) {
    const visible = spec.visible.map(([[target, position, speed]]) => caseFrom({ target, position, speed }, carFleet(target, position, speed)));
    cases = fillCases(visible, Array.from({ length: 42 }, (_, i) => i), (seed) => {
      const n = 1 + (seed % 8);
      const target = 50 + seed;
      const position = Array.from({ length: n }, (_, i) => (seed * 5 + i * 7) % target);
      const unique = [...new Set(position)].slice(0, n);
      while (unique.length < n) unique.push(unique.length);
      const speed = unique.map((_, i) => 1 + ((seed + i * 3) % 9));
      return caseFrom({ target, position: unique, speed }, carFleet(target, unique, speed));
    });
  } else {
    cases = fillCases(spec.visible.map((heights) => caseFrom({ heights }, largestRectangle(heights))), Array.from({ length: 42 }, (_, i) => i), (seed) => {
      const heights = Array.from({ length: 1 + (seed % 14) }, (_, i) => 1 + ((seed * 9 + i * 4 + i * i) % 15));
      return caseFrom({ heights }, largestRectangle(heights));
    });
  }
  problems.push({
    id: spec.id,
    slug: spec.slug,
    title: spec.title,
    difficulty: spec.difficulty,
    tags: spec.tags,
    method: spec.method,
    checker: spec.checker,
    ...cases,
    statement: markdown(spec.title, spec.statement[0], spec.statement.slice(1), ["Input sizes follow the original interview-style constraints.", "Return values must match the described behavior."]),
    editorial: "Use a stack to keep unresolved items. When a new token, bar, or value resolves earlier items, pop them and update the answer.",
    solution: spec.solution,
    hints: ["A stack is useful when the most recent unresolved item should be handled first.", "Keep extra state on the stack when constant-time queries are needed."],
    starter: spec.starter
  });
}

for (const spec of problems) writeProblem(spec);
console.log(`Generated ${problems.length} Two Pointers, Sliding Window, and Stack problem packs.`);
