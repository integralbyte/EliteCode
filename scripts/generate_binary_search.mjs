import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const problemsRoot = path.join(root, "problems");
const TARGET_CASES = Number(process.env.ELITECODE_TARGET_CASES ?? 2000);

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
    checker: { type: "exact" },
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

function sortedUnique(seed, n = 8) {
  const values = [];
  let current = -50 + (seed % 11);
  for (let i = 0; i < n; i += 1) {
    current += 1 + ((seed + i * 2) % 5);
    values.push(current);
  }
  return values;
}

function binarySearch(nums, target) {
  let left = 0;
  let right = nums.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}

function searchMatrix(matrix, target) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  let left = 0;
  let right = rows * cols - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const value = matrix[Math.floor(mid / cols)][mid % cols];
    if (value === target) return true;
    if (value < target) left = mid + 1;
    else right = mid - 1;
  }
  return false;
}

function matrixFromSeed(seed) {
  const rows = 1 + (seed % 5);
  const cols = 1 + ((seed * 3) % 5);
  const matrix = [];
  let value = -20 + seed;
  for (let r = 0; r < rows; r += 1) {
    const row = [];
    for (let c = 0; c < cols; c += 1) {
      value += 1 + ((seed + r + c) % 4);
      row.push(value);
    }
    matrix.push(row);
  }
  return matrix;
}

function minEatingSpeed(piles, h) {
  let left = 1;
  let right = Math.max(...piles);
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    const hours = piles.reduce((sum, pile) => sum + Math.ceil(pile / mid), 0);
    if (hours <= h) right = mid;
    else left = mid + 1;
  }
  return left;
}

function rotate(values, pivot) {
  return values.slice(pivot).concat(values.slice(0, pivot));
}

function findMin(nums) {
  let left = 0;
  let right = nums.length - 1;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] > nums[right]) left = mid + 1;
    else right = mid;
  }
  return nums[left];
}

function searchRotated(nums, target) {
  let left = 0;
  let right = nums.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    if (nums[left] <= nums[mid]) {
      if (nums[left] <= target && target < nums[mid]) right = mid - 1;
      else left = mid + 1;
    } else {
      if (nums[mid] < target && target <= nums[right]) left = mid + 1;
      else right = mid - 1;
    }
  }
  return -1;
}

function timeMapRun(operations, values) {
  const store = new Map();
  const out = [];
  for (let i = 0; i < operations.length; i += 1) {
    const op = operations[i];
    const args = values[i];
    if (op === "TimeMap") continue;
    if (op === "set") {
      const [key, value, timestamp] = args;
      if (!store.has(key)) store.set(key, []);
      store.get(key).push([timestamp, value]);
    } else if (op === "get") {
      const [key, timestamp] = args;
      const entries = store.get(key) ?? [];
      let left = 0;
      let right = entries.length - 1;
      let answer = "";
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (entries[mid][0] <= timestamp) {
          answer = entries[mid][1];
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }
      out.push(answer);
    }
  }
  return out;
}

function medianSortedArrays(nums1, nums2) {
  const merged = [...nums1, ...nums2].sort((a, b) => a - b);
  const n = merged.length;
  if (n % 2) return merged[Math.floor(n / 2)];
  return (merged[n / 2 - 1] + merged[n / 2]) / 2;
}

function pileSeed(seed) {
  const count = 1 + (seed % 8);
  const piles = Array.from({ length: count }, (_, i) => 1 + ((seed * 11 + i * 7) % 80));
  const h = count + (seed % 25);
  return { piles, h };
}

function timeMapSeed(seed) {
  const operations = ["TimeMap"];
  const values = [[]];
  const keys = ["alpha", "beta", "gamma"];
  for (let i = 1; i <= 8 + (seed % 5); i += 1) {
    const key = keys[(seed + i) % keys.length];
    operations.push("set");
    values.push([key, `${key}-${seed}-${i}`, i * 3]);
    if (i % 2 === 0) {
      operations.push("get");
      values.push([key, i * 3 - (seed % 4)]);
    }
    if (i % 3 === 0) {
      operations.push("get");
      values.push([keys[(seed + i + 1) % keys.length], i * 2]);
    }
  }
  operations.push("get");
  values.push(["missing", seed + 10]);
  return { operations, values };
}

const problems = [
  {
    id: 28,
    slug: "binary-search",
    title: "Binary Search",
    difficulty: "Easy",
    tags: ["Binary Search", "Array"],
    method: "search",
    ...fillCases(
      [
        caseFrom({ nums: [-8, -2, 0, 4, 9, 13], target: 9 }, 4),
        caseFrom({ nums: [-8, -2, 0, 4, 9, 13], target: 7 }, -1),
        caseFrom({ nums: [5], target: 5 }, 0)
      ],
      Array.from({ length: 42 }, (_, i) => i + 1),
      (seed) => {
        const nums = sortedUnique(seed, 1 + (seed % 16));
        const target = seed % 3 === 0 ? nums[seed % nums.length] : nums[0] - 1 - seed;
        return caseFrom({ nums, target }, binarySearch(nums, target));
      }
    ),
    statement: markdown(
      "Binary Search",
      "Given a sorted list of distinct integers, return the index of `target`. Return `-1` when `target` is absent.",
      [
        "Input: nums = [-8, -2, 0, 4, 9, 13], target = 9\nOutput: 4",
        "Input: nums = [-8, -2, 0, 4, 9, 13], target = 7\nOutput: -1",
        "Input: nums = [5], target = 5\nOutput: 0"
      ],
      ["`1 <= len(nums) <= 100000`", "`nums` is sorted in strictly increasing order."],
      "Use logarithmic time."
    ),
    editorial: "Maintain a search interval. Compare the middle value to the target and discard the half that cannot contain the answer.",
    solution: "```python\nclass Solution:\n    def search(self, nums, target):\n        left, right = 0, len(nums) - 1\n        while left <= right:\n            mid = (left + right) // 2\n            if nums[mid] == target:\n                return mid\n            if nums[mid] < target:\n                left = mid + 1\n            else:\n                right = mid - 1\n        return -1\n```",
    hints: ["The sorted order lets you discard half the values after one comparison.", "Stop when the search interval becomes empty."],
    starter: "class Solution:\n    def search(self, nums, target):\n        pass"
  },
  {
    id: 29,
    slug: "search-a-2d-matrix",
    title: "Search a 2D Matrix",
    difficulty: "Medium",
    tags: ["Binary Search", "Matrix"],
    method: "searchMatrix",
    ...fillCases(
      [
        caseFrom({ matrix: [[1, 4, 8], [12, 15, 19], [23, 27, 31]], target: 15 }, true),
        caseFrom({ matrix: [[1, 4, 8], [12, 15, 19], [23, 27, 31]], target: 16 }, false),
        caseFrom({ matrix: [[2]], target: 2 }, true)
      ],
      Array.from({ length: 42 }, (_, i) => i + 1),
      (seed) => {
        const matrix = matrixFromSeed(seed);
        const flat = matrix.flat();
        const target = seed % 2 === 0 ? flat[seed % flat.length] : flat.at(-1) + seed + 1;
        return caseFrom({ matrix, target }, searchMatrix(matrix, target));
      }
    ),
    statement: markdown(
      "Search a 2D Matrix",
      "Each row of `matrix` is sorted, and every row starts after the previous row ends. Return whether `target` appears in the matrix.",
      [
        "Input: matrix = [[1,4,8],[12,15,19],[23,27,31]], target = 15\nOutput: true",
        "Input: matrix = [[1,4,8],[12,15,19],[23,27,31]], target = 16\nOutput: false",
        "Input: matrix = [[2]], target = 2\nOutput: true"
      ],
      ["`1 <= rows, cols <= 100`", "Rows are sorted and row ranges do not overlap."]
    ),
    editorial: "Treat the matrix as one sorted array. Convert a virtual index into row and column positions during binary search.",
    solution: "```python\nclass Solution:\n    def searchMatrix(self, matrix, target):\n        rows, cols = len(matrix), len(matrix[0])\n        left, right = 0, rows * cols - 1\n        while left <= right:\n            mid = (left + right) // 2\n            value = matrix[mid // cols][mid % cols]\n            if value == target:\n                return True\n            if value < target:\n                left = mid + 1\n            else:\n                right = mid - 1\n        return False\n```",
    hints: ["The row boundaries make the entire matrix globally sorted.", "A one-dimensional index can be mapped to `(row, col)`."],
    starter: "class Solution:\n    def searchMatrix(self, matrix, target):\n        pass"
  },
  {
    id: 30,
    slug: "koko-eating-bananas",
    title: "Koko Eating Bananas",
    difficulty: "Medium",
    tags: ["Binary Search"],
    method: "minEatingSpeed",
    ...fillCases(
      [
        caseFrom({ piles: [4, 11, 20, 23], h: 6 }, 12),
        caseFrom({ piles: [30, 11, 23, 4, 20], h: 10 }, 11),
        caseFrom({ piles: [9], h: 3 }, 3)
      ],
      Array.from({ length: 42 }, (_, i) => i + 1),
      (seed) => {
        const { piles, h } = pileSeed(seed);
        return caseFrom({ piles, h }, minEatingSpeed(piles, h));
      }
    ),
    statement: markdown(
      "Koko Eating Bananas",
      "Given banana piles and `h` hours, choose the smallest integer eating speed that finishes every pile within `h` hours.",
      [
        "Input: piles = [4, 11, 20, 23], h = 6\nOutput: 12",
        "Input: piles = [30, 11, 23, 4, 20], h = 10\nOutput: 11",
        "Input: piles = [9], h = 3\nOutput: 3"
      ],
      ["`1 <= len(piles) <= 10000`", "`len(piles) <= h <= 10^9`", "`1 <= piles[i] <= 10^9`"]
    ),
    editorial: "A speed either works or does not. If speed `x` works, any larger speed also works. Binary search the smallest working speed.",
    solution: "```python\nimport math\n\nclass Solution:\n    def minEatingSpeed(self, piles, h):\n        left, right = 1, max(piles)\n        while left < right:\n            mid = (left + right) // 2\n            hours = sum(math.ceil(pile / mid) for pile in piles)\n            if hours <= h:\n                right = mid\n            else:\n                left = mid + 1\n        return left\n```",
    hints: ["The answer is between 1 and the largest pile.", "The feasibility function is monotonic."],
    starter: "class Solution:\n    def minEatingSpeed(self, piles, h):\n        pass"
  },
  {
    id: 31,
    slug: "find-minimum-in-rotated-sorted-array",
    title: "Find Minimum in Rotated Sorted Array",
    difficulty: "Medium",
    tags: ["Binary Search", "Array"],
    method: "findMin",
    ...fillCases(
      [
        caseFrom({ nums: [15, 18, 2, 4, 7, 11] }, 2),
        caseFrom({ nums: [3, 4, 5, 1, 2] }, 1),
        caseFrom({ nums: [8] }, 8)
      ],
      Array.from({ length: 42 }, (_, i) => i + 1),
      (seed) => {
        const base = sortedUnique(seed, 1 + (seed % 15));
        const nums = rotate(base, seed % base.length);
        return caseFrom({ nums }, findMin(nums));
      }
    ),
    statement: markdown(
      "Find Minimum in Rotated Sorted Array",
      "A strictly increasing array was rotated some number of times. Return its smallest value.",
      [
        "Input: nums = [15, 18, 2, 4, 7, 11]\nOutput: 2",
        "Input: nums = [3, 4, 5, 1, 2]\nOutput: 1",
        "Input: nums = [8]\nOutput: 8"
      ],
      ["`1 <= len(nums) <= 100000`", "All values are unique."]
    ),
    editorial: "Compare the middle value with the right edge. If the middle is larger, the minimum is to the right; otherwise it is at the middle or to the left.",
    solution: "```python\nclass Solution:\n    def findMin(self, nums):\n        left, right = 0, len(nums) - 1\n        while left < right:\n            mid = (left + right) // 2\n            if nums[mid] > nums[right]:\n                left = mid + 1\n            else:\n                right = mid\n        return nums[left]\n```",
    hints: ["One side of a rotated sorted array remains sorted.", "The right endpoint tells you whether the middle is in the rotated high segment."],
    starter: "class Solution:\n    def findMin(self, nums):\n        pass"
  },
  {
    id: 32,
    slug: "search-in-rotated-sorted-array",
    title: "Search in Rotated Sorted Array",
    difficulty: "Medium",
    tags: ["Binary Search", "Array"],
    method: "search",
    ...fillCases(
      [
        caseFrom({ nums: [11, 15, 2, 4, 6, 8], target: 4 }, 3),
        caseFrom({ nums: [11, 15, 2, 4, 6, 8], target: 10 }, -1),
        caseFrom({ nums: [1], target: 1 }, 0)
      ],
      Array.from({ length: 42 }, (_, i) => i + 1),
      (seed) => {
        const base = sortedUnique(seed, 1 + (seed % 15));
        const nums = rotate(base, seed % base.length);
        const target = seed % 3 === 0 ? nums[seed % nums.length] : base[0] - seed - 2;
        return caseFrom({ nums, target }, searchRotated(nums, target));
      }
    ),
    statement: markdown(
      "Search in Rotated Sorted Array",
      "A sorted array of unique values was rotated. Return the index of `target`, or `-1` if it is missing.",
      [
        "Input: nums = [11, 15, 2, 4, 6, 8], target = 4\nOutput: 3",
        "Input: nums = [11, 15, 2, 4, 6, 8], target = 10\nOutput: -1",
        "Input: nums = [1], target = 1\nOutput: 0"
      ],
      ["`1 <= len(nums) <= 100000`", "All values are unique."],
      "Use logarithmic time."
    ),
    editorial: "At every step, at least one half is sorted. Determine which half is sorted, then decide whether the target belongs in that half.",
    solution: "```python\nclass Solution:\n    def search(self, nums, target):\n        left, right = 0, len(nums) - 1\n        while left <= right:\n            mid = (left + right) // 2\n            if nums[mid] == target:\n                return mid\n            if nums[left] <= nums[mid]:\n                if nums[left] <= target < nums[mid]:\n                    right = mid - 1\n                else:\n                    left = mid + 1\n            else:\n                if nums[mid] < target <= nums[right]:\n                    left = mid + 1\n                else:\n                    right = mid - 1\n        return -1\n```",
    hints: ["Figure out which half is normally sorted.", "Only keep the half that can contain the target."],
    starter: "class Solution:\n    def search(self, nums, target):\n        pass"
  },
  {
    id: 33,
    slug: "time-based-key-value-store",
    title: "Time Based Key-Value Store",
    difficulty: "Medium",
    tags: ["Binary Search", "Design"],
    method: "timeMap",
    ...fillCases(
      [
        caseFrom(
          { operations: ["TimeMap", "set", "get", "get", "set", "get", "get"], values: [[], ["course", "arrays", 1], ["course", 1], ["course", 3], ["course", "graphs", 4], ["course", 4], ["course", 5]] },
          ["arrays", "arrays", "graphs", "graphs"]
        ),
        caseFrom(
          { operations: ["TimeMap", "get", "set", "get"], values: [[], ["missing", 3], ["missing", "now", 5], ["missing", 4]] },
          ["", ""]
        ),
        caseFrom(
          { operations: ["TimeMap", "set", "set", "get"], values: [[], ["x", "a", 2], ["x", "b", 6], ["x", 5]] },
          ["a"]
        )
      ],
      Array.from({ length: 42 }, (_, i) => i + 1),
      (seed) => {
        const { operations, values } = timeMapSeed(seed);
        return caseFrom({ operations, values }, timeMapRun(operations, values));
      }
    ),
    statement: markdown(
      "Time Based Key-Value Store",
      "Design a store that records values by key and timestamp. `get(key, timestamp)` returns the latest value set for that key at or before the requested timestamp, or an empty string if none exists. The judge calls `timeMap(operations, values)` and expects outputs from `get` calls only.",
      [
        "Input: set(course, arrays, 1), get(course, 3), set(course, graphs, 4), get(course, 5)\nOutput: [\"arrays\", \"graphs\"]",
        "Input: get(missing, 3), set(missing, now, 5), get(missing, 4)\nOutput: [\"\", \"\"]",
        "Input: set(x, a, 2), set(x, b, 6), get(x, 5)\nOutput: [\"a\"]"
      ],
      ["Timestamps for each key are provided in increasing order.", "`1 <= timestamp <= 10^7`"]
    ),
    editorial: "Store a sorted list of `(timestamp, value)` pairs for each key. A get request becomes a binary search for the rightmost timestamp not exceeding the query time.",
    solution: "```python\nfrom collections import defaultdict\nimport bisect\n\nclass TimeMap:\n    def __init__(self):\n        self.store = defaultdict(list)\n\n    def set(self, key, value, timestamp):\n        self.store[key].append((timestamp, value))\n\n    def get(self, key, timestamp):\n        entries = self.store.get(key, [])\n        index = bisect.bisect_right(entries, (timestamp, chr(255))) - 1\n        return entries[index][1] if index >= 0 else ''\n\nclass Solution:\n    def timeMap(self, operations, values):\n        obj = None\n        out = []\n        for op, args in zip(operations, values):\n            if op == 'TimeMap':\n                obj = TimeMap()\n            elif op == 'set':\n                obj.set(*args)\n            elif op == 'get':\n                out.append(obj.get(*args))\n        return out\n```",
    hints: ["Values for a key are naturally ordered by timestamp.", "Find the latest timestamp that is not greater than the query."],
    starter: "class TimeMap:\n    def __init__(self):\n        pass\n\n    def set(self, key, value, timestamp):\n        pass\n\n    def get(self, key, timestamp):\n        pass\n\nclass Solution:\n    def timeMap(self, operations, values):\n        pass"
  },
  {
    id: 34,
    slug: "median-of-two-sorted-arrays",
    title: "Median of Two Sorted Arrays",
    difficulty: "Hard",
    tags: ["Binary Search", "Array"],
    method: "findMedianSortedArrays",
    ...fillCases(
      [
        caseFrom({ nums1: [1, 4], nums2: [2, 3, 9] }, 3),
        caseFrom({ nums1: [1, 2], nums2: [3, 4] }, 2.5),
        caseFrom({ nums1: [], nums2: [7] }, 7)
      ],
      Array.from({ length: 42 }, (_, i) => i + 1),
      (seed) => {
        const a = sortedUnique(seed, seed % 7);
        const b = sortedUnique(seed + 13, 1 + ((seed * 2) % 8));
        return caseFrom({ nums1: a, nums2: b }, medianSortedArrays(a, b));
      }
    ),
    statement: markdown(
      "Median of Two Sorted Arrays",
      "Given two sorted arrays, return the median value across all elements.",
      [
        "Input: nums1 = [1, 4], nums2 = [2, 3, 9]\nOutput: 3",
        "Input: nums1 = [1, 2], nums2 = [3, 4]\nOutput: 2.5",
        "Input: nums1 = [], nums2 = [7]\nOutput: 7"
      ],
      ["`0 <= len(nums1), len(nums2) <= 1000`", "At least one array is non-empty."],
      "The optimal approach partitions the two arrays with binary search."
    ),
    editorial: "Binary search the partition point in the smaller array so that the left partition contains half the values and every left value is no greater than every right value.",
    solution: "```python\nclass Solution:\n    def findMedianSortedArrays(self, nums1, nums2):\n        if len(nums1) > len(nums2):\n            nums1, nums2 = nums2, nums1\n        total = len(nums1) + len(nums2)\n        half = (total + 1) // 2\n        left, right = 0, len(nums1)\n        while left <= right:\n            i = (left + right) // 2\n            j = half - i\n            a_left = nums1[i - 1] if i else float('-inf')\n            a_right = nums1[i] if i < len(nums1) else float('inf')\n            b_left = nums2[j - 1] if j else float('-inf')\n            b_right = nums2[j] if j < len(nums2) else float('inf')\n            if a_left <= b_right and b_left <= a_right:\n                if total % 2:\n                    return max(a_left, b_left)\n                return (max(a_left, b_left) + min(a_right, b_right)) / 2\n            if a_left > b_right:\n                right = i - 1\n            else:\n                left = i + 1\n```",
    hints: ["Partition both arrays so the left side contains half the values.", "Binary search the partition in the smaller array."],
    starter: "class Solution:\n    def findMedianSortedArrays(self, nums1, nums2):\n        pass"
  }
];

for (const spec of problems) writeProblem(spec);
console.log(`Generated ${problems.length} Binary Search problem packs.`);
