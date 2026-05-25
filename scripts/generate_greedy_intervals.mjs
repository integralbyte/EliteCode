import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const problemsRoot = path.join(root, "problems");
const TARGET_CASES = Number(process.env.ELITECODE_TARGET_CASES ?? 2000);

function writeProblem(spec) {
  const dir = path.join(problemsRoot, spec.slug);
  fs.mkdirSync(dir, { recursive: true });
  const problem = {
    id: spec.id, slug: spec.slug, title: spec.title, difficulty: spec.difficulty, tags: spec.tags,
    companies: [], statement: spec.statement.trim(), editorial: spec.editorial.trim(), solution_notes: spec.solution.trim(),
    hints: spec.hints, starter_code: { python: spec.starter.trimEnd() + "\n" },
    entrypoint: { class_name: "Solution", method_name: spec.method }, checker: { type: "exact" },
    time_limit_ms: 2500, memory_limit_mb: 256,
    cases: spec.cases.map((item, index) => ({
      id: index < spec.visible ? `case-${index + 1}` : `hidden-${index + 1 - spec.visible}`,
      name: index < spec.visible ? `Case ${index + 1}` : `Hidden Case ${index + 1 - spec.visible}`,
      input: item.input, expected: item.expected, hidden: index >= spec.visible
    }))
  };
  fs.writeFileSync(path.join(dir, "problem.json"), `${JSON.stringify(problem, null, 2)}\n`);
}

const caseFrom = (input, expected) => ({ input, expected });
function fillCases(visible, maker, target = TARGET_CASES) { const cases = [...visible]; let seed = 1; while (cases.length < target) cases.push(maker(seed++)); return { visible: visible.length, cases }; }
function markdown(title, body, examples) { return `# ${title}\n\n${body}\n\n## Examples\n\n${examples.map((e, i) => `**Example ${i + 1}**\n\n\`\`\`text\n${e}\n\`\`\``).join("\n\n")}\n\n## Constraints\n\n- Inputs are sized for local offline execution.\n- Return the value described by the method signature.`; }

function mix(seed, salt = 0) { let value = (seed + 0x9e3779b9 + salt * 0x85ebca6b) >>> 0; value ^= value >>> 16; value = Math.imul(value, 0x7feb352d) >>> 0; value ^= value >>> 15; value = Math.imul(value, 0x846ca68b) >>> 0; value ^= value >>> 16; return value >>> 0; }
const nums = (seed, len = 5 + (mix(seed, 1) % 14), min = -40, mod = 97) => Array.from({ length: len }, (_, i) => min + (mix(seed, i + 2) % mod));
const pos = (seed, len = 5 + (mix(seed, 3) % 14), mod = 23) => Array.from({ length: len }, (_, i) => 1 + (mix(seed, i + 4) % mod));
function word(seed, len = 1 + (mix(seed, 5) % 22), alphabet = "abcdef") { return Array.from({ length: len }, (_, i) => alphabet[mix(seed, i + 6) % alphabet.length]).join(""); }
function maxSubArray(a) { let best = a[0], cur = 0; for (const v of a) { cur = Math.max(v, cur + v); best = Math.max(best, cur); } return best; }
function canJump(a) { let reach = 0; for (let i = 0; i < a.length; i += 1) { if (i > reach) return false; reach = Math.max(reach, i + a[i]); } return true; }
function jumpGameSeed(seed) {
  if (seed % 4 === 0) {
    const prefixLength = 1 + (mix(seed, 16) % 14);
    const suffixLength = 1 + (mix(seed, 17) % 30);
    return [
      ...Array.from({ length: prefixLength }, () => 1),
      0,
      ...Array.from({ length: suffixLength }, (_, i) => 1 + (mix(seed, i + 18) % 8))
    ];
  }

  const length = 3 + (mix(seed, 19) % 36);
  const values = pos(seed, length, 8);
  if (seed % 5 === 0 && length > 4) {
    const zero = 1 + (mix(seed, 20) % (length - 2));
    values[zero] = 0;
    values[zero - 1] = Math.max(values[zero - 1], 2);
  }
  return values;
}
function jumpGameTwoSeed(seed) {
  if (seed % 4 === 0) {
    return Array.from({ length: 2 + (mix(seed, 23) % 30) }, () => 1);
  }
  const length = 3 + (mix(seed, 24) % 38);
  const values = pos(seed, length, 8);
  values[0] = Math.max(values[0], 1);
  return values;
}
function jumps(a) { let jumps = 0, end = 0, far = 0; for (let i = 0; i < a.length - 1; i += 1) { far = Math.max(far, i + a[i]); if (i === end) { jumps += 1; end = far; } } return jumps; }
function gasStation(gas, cost) { let total = 0, tank = 0, start = 0; for (let i = 0; i < gas.length; i += 1) { const diff = gas[i] - cost[i]; total += diff; tank += diff; if (tank < 0) { tank = 0; start = i + 1; } } return total >= 0 ? start : -1; }
function straights(hand, size) { if (hand.length % size) return false; const counts = new Map(); for (const v of hand) counts.set(v, (counts.get(v) ?? 0) + 1); for (const start of [...counts.keys()].sort((a, b) => a - b)) { const need = counts.get(start); if (!need) continue; for (let v = start; v < start + size; v += 1) { if ((counts.get(v) ?? 0) < need) return false; counts.set(v, counts.get(v) - need); } } return true; }
function mergeTriplets(triplets, target) { const good = [false, false, false]; for (const t of triplets) if (t.every((v, i) => v <= target[i])) for (let i = 0; i < 3; i += 1) if (t[i] === target[i]) good[i] = true; return good.every(Boolean); }
function partitionLabels(s) { const last = {}; [...s].forEach((ch, i) => last[ch] = i); const out = []; let start = 0, end = 0; for (let i = 0; i < s.length; i += 1) { end = Math.max(end, last[s[i]]); if (i === end) { out.push(end - start + 1); start = i + 1; } } return out; }
function validParenStar(s) { let low = 0, high = 0; for (const ch of s) { if (ch === "(") { low++; high++; } else if (ch === ")") { low--; high--; } else { low--; high++; } if (high < 0) return false; low = Math.max(low, 0); } return low === 0; }
function insertInterval(intervals, ni) { const out = []; let [s, e] = ni, used = false; for (const [a, b] of intervals) { if (b < s) out.push([a, b]); else if (e < a) { if (!used) { out.push([s, e]); used = true; } out.push([a, b]); } else { s = Math.min(s, a); e = Math.max(e, b); } } if (!used) out.push([s, e]); return out; }
function mergeIntervals(intervals) { const sorted = [...intervals].sort((a, b) => a[0] - b[0]); const out = []; for (const [s, e] of sorted) { if (!out.length || out.at(-1)[1] < s) out.push([s, e]); else out.at(-1)[1] = Math.max(out.at(-1)[1], e); } return out; }
function eraseOverlap(intervals) { intervals = [...intervals].sort((a, b) => a[1] - b[1]); let end = -Infinity, keep = 0; for (const [s, e] of intervals) if (s >= end) { keep++; end = e; } return intervals.length - keep; }
function canAttend(intervals) { intervals = [...intervals].sort((a, b) => a[0] - b[0]); for (let i = 1; i < intervals.length; i += 1) if (intervals[i][0] < intervals[i - 1][1]) return false; return true; }
function rooms(intervals) { const events = []; for (const [s, e] of intervals) { events.push([s, 1], [e, -1]); } events.sort((a, b) => a[0] - b[0] || a[1] - b[1]); let cur = 0, best = 0; for (const [, d] of events) { cur += d; best = Math.max(best, cur); } return best; }
function minInterval(intervals, queries) { return queries.map((q) => { let best = Infinity; for (const [s, e] of intervals) if (s <= q && q <= e) best = Math.min(best, e - s + 1); return Number.isFinite(best) ? best : -1; }); }
function intervalSeed(seed) { const count = 1 + (mix(seed, 20) % 18); const arr = []; for (let i = 0; i < count; i += 1) { const s = (mix(seed, i + 21) % 80) - 20; arr.push([s, s + 1 + (mix(seed, i + 42) % 24)]); } return arr; }
function insertSeed(seed) {
  const count = mix(seed, 30) % 20;
  const intervals = Array.from({ length: count }, (_, i) => {
    const start = i * 5 + (mix(seed, i + 31) % 2);
    return [start, start + 1 + (mix(seed, i + 51) % 3)];
  });
  if (count === 0) return { intervals, newInterval: [seed % 7, seed % 7 + 2] };
  if (seed % 4 === 0) return { intervals, newInterval: [intervals[0][0] - 6, intervals[0][0] - 2] };
  if (seed % 4 === 1) return { intervals, newInterval: [intervals.at(-1)[1] + 2, intervals.at(-1)[1] + 7] };
  if (seed % 4 === 2) {
    const mid = Math.floor(count / 2);
    return { intervals, newInterval: [intervals[Math.max(0, mid - 1)][0], intervals[Math.min(count - 1, mid + 1)][1]] };
  }
  return { intervals, newInterval: [intervals[0][0] - 1, intervals.at(-1)[1] + 1] };
}
function partitionSeed(seed) { if (seed % 5 === 0) return word(seed, 1 + (seed % 26), "abcdefghijklmnopqrstuvwxyz"); const chunks = []; const alphabet = "abcdefghijklmnopqrstuvwxyz"; for (let i = 0; i < 1 + (mix(seed, 50) % 8); i += 1) { const a = alphabet[mix(seed, i + 51) % alphabet.length]; const b = alphabet[mix(seed, i + 71) % alphabet.length]; chunks.push(`${a}${word(seed + i, mix(seed, i + 91) % 5, "abcde")}${seed % 3 === 0 ? a : b}`); } return chunks.join(""); }
function starParenSeed(seed) {
  const fixed = [
    "",
    "*",
    "(",
    ")",
    "()",
    "(*)",
    "(*))",
    "(((******)))",
    "((*)",
    "*)",
    "((*)*)",
    "****",
    "(()*())",
    "())*"
  ];
  if (seed <= fixed.length) return fixed[seed - 1];

  const left = 1 + (mix(seed, 100) % 28);
  const stars = 1 + (mix(seed, 101) % 28);
  const right = 1 + (mix(seed, 102) % 28);
  if (seed % 6 === 0) return "(".repeat(left) + "*".repeat(stars) + ")".repeat(right);
  if (seed % 6 === 1) return ")".repeat(1 + (right % 9)) + "*".repeat(stars) + "(".repeat(1 + (left % 11));
  if (seed % 6 === 2) return "(".repeat(left) + "*".repeat(stars);
  if (seed % 6 === 3) return "*".repeat(stars) + ")".repeat(right);
  if (seed % 6 === 4) {
    const length = 8 + (mix(seed, 103) % 64);
    return Array.from({ length }, (_, i) => (mix(seed, i + 104) % 3 === 0 ? "(" : mix(seed, i + 105) % 3 === 1 ? "*" : ")")).join("");
  }
  const chars = ["(", ")", "*"];
  return Array.from({ length: 1 + (mix(seed, 106) % 72) }, (_, i) => chars[mix(seed, i + 107) % chars.length]).join("");
}

function makeProblem(id, slug, title, difficulty, tags, method, visible, maker, body, examples, solution, starter) {
  const filled = fillCases(visible, maker);
  return { id, slug, title, difficulty, tags, method, visible: filled.visible, cases: filled.cases,
    statement: markdown(title, body, examples), editorial: "Track the local choice that leaves the most room for future choices, or sort intervals so conflicts can be resolved with one pass.",
    solution, hints: ["Sort first when relative order drives the decision.", "Keep the smallest state that proves future feasibility."], starter };
}

const problems = [
  makeProblem(122, "maximum-subarray", "Maximum Subarray", "Medium", ["Array", "Divide and Conquer", "Dynamic Programming"], "maxSubArray",
    [caseFrom({ nums: [-2,1,-3,4,-1,2,1,-5,4] }, 6), caseFrom({ nums: [5] }, 5), caseFrom({ nums: [-3,-2,-5] }, -2)],
    (seed) => { const a = nums(seed); return caseFrom({ nums: a }, maxSubArray(a)); }, "Return the maximum sum of a non-empty contiguous subarray.", ["Input: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6", "Input: nums = [5]\nOutput: 5", "Input: nums = [-3,-2,-5]\nOutput: -2"],
    "```python\nclass Solution:\n    def maxSubArray(self, nums):\n        best = cur = nums[0]\n        for value in nums[1:]:\n            cur = max(value, cur + value)\n            best = max(best, cur)\n        return best\n```", "class Solution:\n    def maxSubArray(self, nums):\n        pass"),
  makeProblem(123, "jump-game", "Jump Game", "Medium", ["Array", "Dynamic Programming", "Greedy"], "canJump",
    [caseFrom({ nums: [2,3,1,1,4] }, true), caseFrom({ nums: [3,2,1,0,4] }, false), caseFrom({ nums: [0] }, true)],
    (seed) => { const a = jumpGameSeed(seed); return caseFrom({ nums: a }, canJump(a)); }, "Return whether the last index can be reached from index 0.", ["Input: nums = [2,3,1,1,4]\nOutput: true", "Input: nums = [3,2,1,0,4]\nOutput: false", "Input: nums = [0]\nOutput: true"],
    "```python\nclass Solution:\n    def canJump(self, nums):\n        reach = 0\n        for i, jump in enumerate(nums):\n            if i > reach: return False\n            reach = max(reach, i + jump)\n        return True\n```", "class Solution:\n    def canJump(self, nums):\n        pass"),
  makeProblem(124, "jump-game-ii", "Jump Game II", "Medium", ["Array", "Dynamic Programming", "Greedy"], "jump",
    [caseFrom({ nums: [2,3,1,1,4] }, 2), caseFrom({ nums: [2,3,0,1,4] }, 2), caseFrom({ nums: [1,1,1] }, 2)],
    (seed) => { const a = jumpGameTwoSeed(seed); return caseFrom({ nums: a }, jumps(a)); }, "Return the minimum jumps needed to reach the last index. Generated cases are reachable.", ["Input: nums = [2,3,1,1,4]\nOutput: 2", "Input: nums = [2,3,0,1,4]\nOutput: 2", "Input: nums = [1,1,1]\nOutput: 2"],
    "```python\nclass Solution:\n    def jump(self, nums):\n        jumps = end = far = 0\n        for i in range(len(nums) - 1):\n            far = max(far, i + nums[i])\n            if i == end:\n                jumps += 1; end = far\n        return jumps\n```", "class Solution:\n    def jump(self, nums):\n        pass"),
  makeProblem(125, "gas-station", "Gas Station", "Medium", ["Array", "Greedy"], "canCompleteCircuit",
    [caseFrom({ gas: [1,2,3,4,5], cost: [3,4,5,1,2] }, 3), caseFrom({ gas: [2,3,4], cost: [3,4,3] }, -1), caseFrom({ gas: [5], cost: [4] }, 0)],
    (seed) => { const gas = pos(seed, 1 + (mix(seed, 250) % 20), 9), cost = pos(seed + 5, gas.length, 9); return caseFrom({ gas, cost }, gasStation(gas, cost)); }, "Return the starting station index that can complete the circuit, or `-1`.", ["Input: gas = [1,2,3,4,5], cost = [3,4,5,1,2]\nOutput: 3", "Input: gas = [2,3,4], cost = [3,4,3]\nOutput: -1", "Input: gas = [5], cost = [4]\nOutput: 0"],
    "```python\nclass Solution:\n    def canCompleteCircuit(self, gas, cost):\n        total = tank = start = 0\n        for i, (g, c) in enumerate(zip(gas, cost)):\n            diff = g - c; total += diff; tank += diff\n            if tank < 0: start = i + 1; tank = 0\n        return start if total >= 0 else -1\n```", "class Solution:\n    def canCompleteCircuit(self, gas, cost):\n        pass"),
  makeProblem(126, "hand-of-straights", "Hand of Straights", "Medium", ["Array", "Hash Table", "Greedy", "Sorting"], "isNStraightHand",
    [caseFrom({ hand: [1,2,3,6,2,3,4,7,8], groupSize: 3 }, true), caseFrom({ hand: [1,2,3,4,5], groupSize: 4 }, false), caseFrom({ hand: [8,10,12], groupSize: 1 }, true)],
    (seed) => { const hand = pos(seed, 1 + (mix(seed, 260) % 20), 10); const groupSize = 1 + (seed % 4); return caseFrom({ hand, groupSize }, straights(hand, groupSize)); }, "Return whether cards can be rearranged into groups of consecutive values of length `groupSize`.", ["Input: hand = [1,2,3,6,2,3,4,7,8], groupSize = 3\nOutput: true", "Input: hand = [1,2,3,4,5], groupSize = 4\nOutput: false", "Input: hand = [8,10,12], groupSize = 1\nOutput: true"],
    "```python\nfrom collections import Counter\n\nclass Solution:\n    def isNStraightHand(self, hand, groupSize):\n        if len(hand) % groupSize: return False\n        counts = Counter(hand)\n        for start in sorted(counts):\n            need = counts[start]\n            if need:\n                for value in range(start, start + groupSize):\n                    if counts[value] < need: return False\n                    counts[value] -= need\n        return True\n```", "class Solution:\n    def isNStraightHand(self, hand, groupSize):\n        pass"),
  makeProblem(127, "merge-triplets-to-form-target-triplet", "Merge Triplets to Form Target Triplet", "Medium", ["Array", "Greedy"], "mergeTriplets",
    [caseFrom({ triplets: [[2,5,3],[1,8,4],[1,7,5]], target: [2,7,5] }, true), caseFrom({ triplets: [[3,4,5],[4,5,6]], target: [3,2,5] }, false), caseFrom({ triplets: [[1,1,1]], target: [1,1,1] }, true)],
    (seed) => { const target = [1 + (mix(seed, 120) % 30), 1 + (mix(seed, 121) % 30), 1 + (mix(seed, 122) % 30)]; const triplets = Array.from({ length: 1 + (mix(seed, 123) % 20) }, (_, i) => target.map((v, j) => Math.max(1, v - (mix(seed, i * 3 + j + 130) % 6)))); if (seed % 4 === 0) triplets.push(target.map((v) => v + 1 + (seed % 3))); if (seed % 5 === 0) for (let j = 0; j < 3; j += 1) triplets.push(target.map((v, i) => i === j ? v : Math.max(1, v - 1))); return caseFrom({ triplets, target }, mergeTriplets(triplets, target)); }, "Return whether selected triplets can be coordinate-wise merged to exactly equal `target`.", ["Input: triplets = [[2,5,3],[1,8,4],[1,7,5]], target = [2,7,5]\nOutput: true", "Input: triplets = [[3,4,5],[4,5,6]], target = [3,2,5]\nOutput: false", "Input: triplets = [[1,1,1]], target = [1,1,1]\nOutput: true"],
    "```python\nclass Solution:\n    def mergeTriplets(self, triplets, target):\n        good = [False, False, False]\n        for triplet in triplets:\n            if all(triplet[i] <= target[i] for i in range(3)):\n                for i in range(3): good[i] |= triplet[i] == target[i]\n        return all(good)\n```", "class Solution:\n    def mergeTriplets(self, triplets, target):\n        pass"),
  makeProblem(128, "partition-labels", "Partition Labels", "Medium", ["Hash Table", "Two Pointers", "String", "Greedy"], "partitionLabels",
    [caseFrom({ s: "ababcbacadefegdehijhklij" }, [9,7,8]), caseFrom({ s: "eccbbbbdec" }, [10]), caseFrom({ s: "abc" }, [1,1,1])],
    (seed) => { const s = partitionSeed(seed); return caseFrom({ s }, partitionLabels(s)); }, "Split a string into as many parts as possible so each letter appears in at most one part.", ["Input: s = ababcbacadefegdehijhklij\nOutput: [9,7,8]", "Input: s = eccbbbbdec\nOutput: [10]", "Input: s = abc\nOutput: [1,1,1]"],
    "```python\nclass Solution:\n    def partitionLabels(self, s):\n        last = {ch: i for i, ch in enumerate(s)}\n        out = []\n        start = end = 0\n        for i, ch in enumerate(s):\n            end = max(end, last[ch])\n            if i == end:\n                out.append(end - start + 1); start = i + 1\n        return out\n```", "class Solution:\n    def partitionLabels(self, s):\n        pass"),
  makeProblem(129, "valid-parenthesis-string", "Valid Parenthesis String", "Medium", ["String", "Dynamic Programming", "Stack", "Greedy"], "checkValidString",
    ["(*)", "(*))", ")*(", "", "*", "(", ")", "(((******)))", "((*)", "())*"].map((s) => caseFrom({ s }, validParenStar(s))),
    (seed) => { const s = starParenSeed(seed); return caseFrom({ s }, validParenStar(s)); }, "Return whether `*` can be treated as `(`, `)`, or empty to make the parenthesis string valid.", ["Input: s = (*)\nOutput: true", "Input: s = (*))\nOutput: true", "Input: s = )*(\nOutput: false"],
    "```python\nclass Solution:\n    def checkValidString(self, s):\n        low = high = 0\n        for ch in s:\n            if ch == '(':\n                low += 1; high += 1\n            elif ch == ')':\n                low -= 1; high -= 1\n            else:\n                low -= 1; high += 1\n            if high < 0: return False\n            low = max(low, 0)\n        return low == 0\n```", "class Solution:\n    def checkValidString(self, s):\n        pass"),
  makeProblem(130, "insert-interval", "Insert Interval", "Medium", ["Array"], "insert",
    [caseFrom({ intervals: [[1,3],[6,9]], newInterval: [2,5] }, [[1,5],[6,9]]), caseFrom({ intervals: [[1,2],[3,5],[6,7],[8,10]], newInterval: [4,8] }, [[1,2],[3,10]]), caseFrom({ intervals: [], newInterval: [4,8] }, [[4,8]])],
    (seed) => { const { intervals, newInterval } = insertSeed(seed); return caseFrom({ intervals, newInterval }, insertInterval(intervals, newInterval)); }, "Insert a new interval into sorted non-overlapping intervals and merge overlaps.", ["Input: intervals = [[1,3],[6,9]], newInterval = [2,5]\nOutput: [[1,5],[6,9]]", "Input: intervals = [[1,2],[3,5],[6,7],[8,10]], newInterval = [4,8]\nOutput: [[1,2],[3,10]]", "Input: intervals = [], newInterval = [4,8]\nOutput: [[4,8]]"],
    "```python\nclass Solution:\n    def insert(self, intervals, newInterval):\n        out = []\n        start, end = newInterval\n        placed = False\n        for a, b in intervals:\n            if b < start: out.append([a, b])\n            elif end < a:\n                if not placed: out.append([start, end]); placed = True\n                out.append([a, b])\n            else:\n                start, end = min(start, a), max(end, b)\n        if not placed: out.append([start, end])\n        return out\n```", "class Solution:\n    def insert(self, intervals, newInterval):\n        pass"),
  makeProblem(131, "merge-intervals", "Merge Intervals", "Medium", ["Array", "Sorting"], "merge",
    [caseFrom({ intervals: [[1,3],[2,6],[8,10],[15,18]] }, [[1,6],[8,10],[15,18]]), caseFrom({ intervals: [[1,4],[4,5]] }, [[1,5]]), caseFrom({ intervals: [[5,7]] }, [[5,7]])],
    (seed) => { const intervals = intervalSeed(seed); return caseFrom({ intervals }, mergeIntervals(intervals)); }, "Merge all overlapping intervals.", ["Input: intervals = [[1,3],[2,6],[8,10],[15,18]]\nOutput: [[1,6],[8,10],[15,18]]", "Input: intervals = [[1,4],[4,5]]\nOutput: [[1,5]]", "Input: intervals = [[5,7]]\nOutput: [[5,7]]"],
    "```python\nclass Solution:\n    def merge(self, intervals):\n        intervals.sort()\n        out = []\n        for start, end in intervals:\n            if not out or out[-1][1] < start: out.append([start, end])\n            else: out[-1][1] = max(out[-1][1], end)\n        return out\n```", "class Solution:\n    def merge(self, intervals):\n        pass"),
  makeProblem(132, "non-overlapping-intervals", "Non-overlapping Intervals", "Medium", ["Array", "Dynamic Programming", "Greedy", "Sorting"], "eraseOverlapIntervals",
    [caseFrom({ intervals: [[1,2],[2,3],[3,4],[1,3]] }, 1), caseFrom({ intervals: [[1,2],[1,2],[1,2]] }, 2), caseFrom({ intervals: [[1,2],[2,3]] }, 0)],
    (seed) => { const intervals = intervalSeed(seed); return caseFrom({ intervals }, eraseOverlap(intervals)); }, "Return the minimum number of intervals to remove so the rest do not overlap.", ["Input: intervals = [[1,2],[2,3],[3,4],[1,3]]\nOutput: 1", "Input: intervals = [[1,2],[1,2],[1,2]]\nOutput: 2", "Input: intervals = [[1,2],[2,3]]\nOutput: 0"],
    "```python\nclass Solution:\n    def eraseOverlapIntervals(self, intervals):\n        intervals.sort(key=lambda item: item[1])\n        end = float('-inf'); keep = 0\n        for start, finish in intervals:\n            if start >= end:\n                keep += 1; end = finish\n        return len(intervals) - keep\n```", "class Solution:\n    def eraseOverlapIntervals(self, intervals):\n        pass"),
  makeProblem(133, "meeting-rooms", "Meeting Rooms", "Easy", ["Array", "Sorting"], "canAttendMeetings",
    [caseFrom({ intervals: [[0,30],[35,40],[45,50]] }, true), caseFrom({ intervals: [[7,10],[2,8]] }, false), caseFrom({ intervals: [] }, true)],
    (seed) => { const intervals = intervalSeed(seed); return caseFrom({ intervals }, canAttend(intervals)); }, "Return whether one person can attend all meetings without overlapping intervals.", ["Input: intervals = [[0,30],[35,40],[45,50]]\nOutput: true", "Input: intervals = [[7,10],[2,8]]\nOutput: false", "Input: intervals = []\nOutput: true"],
    "```python\nclass Solution:\n    def canAttendMeetings(self, intervals):\n        intervals.sort()\n        return all(intervals[i][0] >= intervals[i - 1][1] for i in range(1, len(intervals)))\n```", "class Solution:\n    def canAttendMeetings(self, intervals):\n        pass"),
  makeProblem(134, "meeting-rooms-ii", "Meeting Rooms II", "Medium", ["Array", "Two Pointers", "Greedy", "Sorting", "Heap"], "minMeetingRooms",
    [caseFrom({ intervals: [[0,30],[5,10],[15,20]] }, 2), caseFrom({ intervals: [[7,10],[2,4]] }, 1), caseFrom({ intervals: [] }, 0)],
    (seed) => { const intervals = intervalSeed(seed); return caseFrom({ intervals }, rooms(intervals)); }, "Return the minimum number of rooms required to host all meetings.", ["Input: intervals = [[0,30],[5,10],[15,20]]\nOutput: 2", "Input: intervals = [[7,10],[2,4]]\nOutput: 1", "Input: intervals = []\nOutput: 0"],
    "```python\nimport heapq\n\nclass Solution:\n    def minMeetingRooms(self, intervals):\n        heap = []\n        for start, end in sorted(intervals):\n            if heap and heap[0] <= start: heapq.heappop(heap)\n            heapq.heappush(heap, end)\n        return len(heap)\n```", "class Solution:\n    def minMeetingRooms(self, intervals):\n        pass"),
  makeProblem(135, "minimum-interval-to-include-each-query", "Minimum Interval to Include Each Query", "Hard", ["Array", "Binary Search", "Line Sweep", "Sorting", "Heap"], "minInterval",
    [caseFrom({ intervals: [[1,4],[2,4],[3,6],[4,4]], queries: [2,3,4,5] }, [3,3,1,4]), caseFrom({ intervals: [[2,3],[2,5],[1,8],[20,25]], queries: [2,19,5,22] }, [2,-1,4,6]), caseFrom({ intervals: [[5,8]], queries: [4,5,9] }, [-1,4,-1])],
    (seed) => { const intervals = intervalSeed(seed); const queries = pos(seed + 2, 4 + (seed % 5), 22); return caseFrom({ intervals, queries }, minInterval(intervals, queries)); }, "For each query point, return the length of the smallest interval containing it, or `-1`.", ["Input: intervals = [[1,4],[2,4],[3,6],[4,4]], queries = [2,3,4,5]\nOutput: [3,3,1,4]", "Input: intervals = [[2,3],[2,5],[1,8],[20,25]], queries = [2,19,5,22]\nOutput: [2,-1,4,6]", "Input: intervals = [[5,8]], queries = [4,5,9]\nOutput: [-1,4,-1]"],
    "```python\nimport heapq\n\nclass Solution:\n    def minInterval(self, intervals, queries):\n        intervals.sort()\n        answer = {}\n        heap = []\n        i = 0\n        for q in sorted(queries):\n            while i < len(intervals) and intervals[i][0] <= q:\n                start, end = intervals[i]\n                heapq.heappush(heap, (end - start + 1, end))\n                i += 1\n            while heap and heap[0][1] < q: heapq.heappop(heap)\n            answer[q] = heap[0][0] if heap else -1\n        return [answer[q] for q in queries]\n```", "class Solution:\n    def minInterval(self, intervals, queries):\n        pass")
];

for (const problem of problems) writeProblem(problem);
console.log(`Generated ${problems.length} greedy/interval problem packs.`);
