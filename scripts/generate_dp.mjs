import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const problemsRoot = path.join(root, "problems");
const TARGET_CASES = 26;

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
    time_limit_ms: spec.timeLimitMs ?? 2500,
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

function markdown(title, body, examples) {
  return `# ${title}

${body.trim()}

## Examples

${examples.map((example, index) => `**Example ${index + 1}**\n\n\`\`\`text\n${example.trim()}\n\`\`\``).join("\n\n")}

## Constraints

- Inputs are intentionally modest for local offline execution.
- Return the value described by the method signature.`;
}

const caseFrom = (input, expected) => ({ input, expected });

function fillCases(visible, maker, target = TARGET_CASES) {
  const cases = [...visible];
  let seed = 1;
  while (cases.length < target) cases.push(maker(seed++));
  return { visible: visible.length, cases };
}

const nums = (seed, length = 4 + (seed % 8), min = -10, mod = 25) =>
  Array.from({ length }, (_, i) => min + ((seed * 17 + i * 9) % mod));
const posNums = (seed, length = 4 + (seed % 8), mod = 20) =>
  Array.from({ length }, (_, i) => 1 + ((seed * 13 + i * 7) % mod));

function climbStairs(n) { let a = 1, b = 1; for (let i = 0; i < n; i += 1) [a, b] = [b, a + b]; return a; }
function minCost(cost) { let a = 0, b = 0; for (let i = cost.length - 1; i >= 0; i -= 1) [a, b] = [cost[i] + Math.min(a, b), a]; return Math.min(a, b); }
function robLine(values) { let take = 0, skip = 0; for (const value of values) [take, skip] = [skip + value, Math.max(take, skip)]; return Math.max(take, skip); }
function robCircle(values) { if (values.length === 1) return values[0]; return Math.max(robLine(values.slice(1)), robLine(values.slice(0, -1))); }
function isPal(s) { return s === [...s].reverse().join(""); }
function longestPal(s) { let best = ""; for (let i = 0; i < s.length; i += 1) for (let j = i + 1; j <= s.length; j += 1) { const part = s.slice(i, j); if (part.length > best.length && isPal(part)) best = part; } return best; }
function countPals(s) { let count = 0; for (let i = 0; i < s.length; i += 1) for (let j = i + 1; j <= s.length; j += 1) if (isPal(s.slice(i, j))) count += 1; return count; }
function decodeWays(s) { if (!s || s[0] === "0") return 0; const dp = Array(s.length + 1).fill(0); dp[0] = dp[1] = 1; for (let i = 2; i <= s.length; i += 1) { if (s[i - 1] !== "0") dp[i] += dp[i - 1]; const two = Number(s.slice(i - 2, i)); if (two >= 10 && two <= 26) dp[i] += dp[i - 2]; } return dp[s.length]; }
function coinChange(coins, amount) { const dp = Array(amount + 1).fill(Infinity); dp[0] = 0; for (const coin of coins) for (let a = coin; a <= amount; a += 1) dp[a] = Math.min(dp[a], dp[a - coin] + 1); return Number.isFinite(dp[amount]) ? dp[amount] : -1; }
function maxProduct(values) { let best = values[0], hi = values[0], lo = values[0]; for (let i = 1; i < values.length; i += 1) { const value = values[i]; const nextHi = Math.max(value, hi * value, lo * value); lo = Math.min(value, hi * value, lo * value); hi = nextHi; best = Math.max(best, hi); } return best; }
function wordBreak(s, dict) { const words = new Set(dict); const dp = Array(s.length + 1).fill(false); dp[0] = true; for (let i = 1; i <= s.length; i += 1) for (let j = 0; j < i; j += 1) if (dp[j] && words.has(s.slice(j, i))) dp[i] = true; return dp[s.length]; }
function lis(values) { const tails = []; for (const value of values) { let l = 0, r = tails.length; while (l < r) { const m = (l + r) >> 1; if (tails[m] < value) l = m + 1; else r = m; } tails[l] = value; } return tails.length; }
function canPartition(values) { const sum = values.reduce((a, b) => a + b, 0); if (sum % 2) return false; const target = sum / 2; const dp = Array(target + 1).fill(false); dp[0] = true; for (const value of values) for (let t = target; t >= value; t -= 1) dp[t] ||= dp[t - value]; return dp[target]; }
function uniquePaths(m, n) { const dp = Array(n).fill(1); for (let r = 1; r < m; r += 1) for (let c = 1; c < n; c += 1) dp[c] += dp[c - 1]; return dp[n - 1]; }
function lcs(a, b) { const dp = Array(b.length + 1).fill(0); for (let i = a.length - 1; i >= 0; i -= 1) { let prev = 0; for (let j = b.length - 1; j >= 0; j -= 1) { const old = dp[j]; dp[j] = a[i] === b[j] ? 1 + prev : Math.max(dp[j], dp[j + 1]); prev = old; } } return dp[0]; }
function stockCooldown(prices) { let hold = -Infinity, sold = 0, rest = 0; for (const price of prices) { const oldSold = sold; sold = hold + price; hold = Math.max(hold, rest - price); rest = Math.max(rest, oldSold); } return Math.max(sold, rest); }
function coinChange2(amount, coins) { const dp = Array(amount + 1).fill(0); dp[0] = 1; for (const coin of coins) for (let a = coin; a <= amount; a += 1) dp[a] += dp[a - coin]; return dp[amount]; }
function targetSumWays(values, target) { let map = new Map([[0, 1]]); for (const value of values) { const next = new Map(); for (const [sum, count] of map) { next.set(sum + value, (next.get(sum + value) ?? 0) + count); next.set(sum - value, (next.get(sum - value) ?? 0) + count); } map = next; } return map.get(target) ?? 0; }
function interleave(a, b, c) { if (a.length + b.length !== c.length) return false; const dp = Array(b.length + 1).fill(false); dp[0] = true; for (let j = 1; j <= b.length; j += 1) dp[j] = dp[j - 1] && b[j - 1] === c[j - 1]; for (let i = 1; i <= a.length; i += 1) { dp[0] = dp[0] && a[i - 1] === c[i - 1]; for (let j = 1; j <= b.length; j += 1) dp[j] = (dp[j] && a[i - 1] === c[i + j - 1]) || (dp[j - 1] && b[j - 1] === c[i + j - 1]); } return dp[b.length]; }
function lip(matrix) { const rows = matrix.length, cols = matrix[0].length, memo = Array.from({ length: rows }, () => Array(cols).fill(0)); function dfs(r, c) { if (memo[r][c]) return memo[r][c]; let best = 1; for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nr = r + dr, nc = c + dc; if (nr >= 0 && nc >= 0 && nr < rows && nc < cols && matrix[nr][nc] > matrix[r][c]) best = Math.max(best, 1 + dfs(nr, nc)); } return memo[r][c] = best; } return Math.max(...matrix.flatMap((row, r) => row.map((_, c) => dfs(r, c)))); }
function distinct(s, t) { const dp = Array(t.length + 1).fill(0); dp[0] = 1; for (const ch of s) for (let j = t.length - 1; j >= 0; j -= 1) if (ch === t[j]) dp[j + 1] += dp[j]; return dp[t.length]; }
function edit(a, b) { const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0)); for (let i = 0; i <= a.length; i += 1) dp[i][0] = i; for (let j = 0; j <= b.length; j += 1) dp[0][j] = j; for (let i = 1; i <= a.length; i += 1) for (let j = 1; j <= b.length; j += 1) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]); return dp[a.length][b.length]; }
function burst(values) { const arr = [1, ...values, 1], n = arr.length; const dp = Array.from({ length: n }, () => Array(n).fill(0)); for (let len = 2; len < n; len += 1) for (let left = 0; left + len < n; left += 1) { const right = left + len; for (let mid = left + 1; mid < right; mid += 1) dp[left][right] = Math.max(dp[left][right], dp[left][mid] + dp[mid][right] + arr[left] * arr[mid] * arr[right]); } return dp[0][n - 1]; }
function regex(s, p) { const dp = Array.from({ length: s.length + 1 }, () => Array(p.length + 1).fill(false)); dp[0][0] = true; for (let j = 2; j <= p.length; j += 1) if (p[j - 1] === "*") dp[0][j] = dp[0][j - 2]; for (let i = 1; i <= s.length; i += 1) for (let j = 1; j <= p.length; j += 1) { if (p[j - 1] === "." || p[j - 1] === s[i - 1]) dp[i][j] = dp[i - 1][j - 1]; else if (p[j - 1] === "*") dp[i][j] = dp[i][j - 2] || ((p[j - 2] === "." || p[j - 2] === s[i - 1]) && dp[i - 1][j]); } return dp[s.length][p.length]; }

const matrix = (seed) => Array.from({ length: 2 + (seed % 3) }, (_, r) => Array.from({ length: 2 + ((seed + 1) % 3) }, (_, c) => ((seed * 11 + r * 5 + c * 7) % 20)));
const stringSamples = ["bananas", "cbbd", "forgeeksskeegfor", "abcdd", "levelup", "noonabc"];

const palindromeChecker = `
from __future__ import annotations
from typing import Any

def check(input_data: dict[str, Any], expected: str, actual: Any) -> dict[str, Any]:
    s = input_data["s"]
    if not isinstance(actual, str):
        return {"passed": False, "message": "Expected a string."}
    ok = actual in s and actual == actual[::-1] and len(actual) == len(expected)
    return {"passed": ok, "message": ""}
`;

function makeProblem(id, slug, title, difficulty, tags, method, visible, maker, body, examples, solution, starter, checker = null) {
  const filled = fillCases(visible, maker);
  return {
    id, slug, title, difficulty, tags, method, visible: filled.visible, cases: filled.cases, checker,
    statement: markdown(title, body, examples),
    editorial: "Define the subproblem state, choose the recurrence from the last decision, and fill states in an order where dependencies are already known.",
    solution,
    hints: ["Identify what information must be remembered between decisions.", "Cache repeated subproblems or fill a table iteratively."],
    starter
  };
}

const problems = [
  makeProblem(99, "climbing-stairs", "Climbing Stairs", "Easy", ["Math", "Dynamic Programming", "Memoization"], "climbStairs",
    [caseFrom({ n: 2 }, 2), caseFrom({ n: 5 }, 8), caseFrom({ n: 1 }, 1)],
    (seed) => { const n = 1 + (seed % 30); return caseFrom({ n }, climbStairs(n)); },
    "You can climb 1 or 2 steps at a time. Return how many distinct ways reach exactly step `n`.",
    ["Input: n = 2\nOutput: 2", "Input: n = 5\nOutput: 8", "Input: n = 1\nOutput: 1"],
    "```python\nclass Solution:\n    def climbStairs(self, n):\n        a = b = 1\n        for _ in range(n):\n            a, b = b, a + b\n        return a\n```", "class Solution:\n    def climbStairs(self, n):\n        pass"),
  makeProblem(100, "min-cost-climbing-stairs", "Min Cost Climbing Stairs", "Easy", ["Array", "Dynamic Programming"], "minCostClimbingStairs",
    [caseFrom({ cost: [10, 15, 20] }, 15), caseFrom({ cost: [1, 100, 1, 1, 1, 100, 1] }, 4), caseFrom({ cost: [3, 4] }, 3)],
    (seed) => { const cost = posNums(seed, 2 + (seed % 10), 30); return caseFrom({ cost }, minCost(cost)); },
    "Each stair has a cost paid when stepped on. You may start at stair 0 or 1 and move one or two stairs. Return the minimum cost to reach the top.",
    ["Input: cost = [10,15,20]\nOutput: 15", "Input: cost = [1,100,1,1,1,100,1]\nOutput: 4", "Input: cost = [3,4]\nOutput: 3"],
    "```python\nclass Solution:\n    def minCostClimbingStairs(self, cost):\n        one = two = 0\n        for value in reversed(cost):\n            one, two = value + min(one, two), one\n        return min(one, two)\n```", "class Solution:\n    def minCostClimbingStairs(self, cost):\n        pass"),
  makeProblem(101, "house-robber", "House Robber", "Medium", ["Array", "Dynamic Programming"], "rob",
    [caseFrom({ nums: [2, 7, 9, 3, 1] }, 12), caseFrom({ nums: [5] }, 5), caseFrom({ nums: [2, 1, 1, 2] }, 4)],
    (seed) => { const arr = posNums(seed, 1 + (seed % 12), 40); return caseFrom({ nums: arr }, robLine(arr)); },
    "Choose non-adjacent houses to maximize robbed money.",
    ["Input: nums = [2,7,9,3,1]\nOutput: 12", "Input: nums = [5]\nOutput: 5", "Input: nums = [2,1,1,2]\nOutput: 4"],
    "```python\nclass Solution:\n    def rob(self, nums):\n        take = skip = 0\n        for value in nums:\n            take, skip = skip + value, max(take, skip)\n        return max(take, skip)\n```", "class Solution:\n    def rob(self, nums):\n        pass"),
  makeProblem(102, "house-robber-ii", "House Robber II", "Medium", ["Array", "Dynamic Programming"], "rob",
    [caseFrom({ nums: [2, 3, 2] }, 3), caseFrom({ nums: [1, 2, 3, 1] }, 4), caseFrom({ nums: [9] }, 9)],
    (seed) => { const arr = posNums(seed, 1 + (seed % 12), 40); return caseFrom({ nums: arr }, robCircle(arr)); },
    "Houses form a circle, so the first and last houses are adjacent. Return the maximum non-adjacent sum.",
    ["Input: nums = [2,3,2]\nOutput: 3", "Input: nums = [1,2,3,1]\nOutput: 4", "Input: nums = [9]\nOutput: 9"],
    "```python\nclass Solution:\n    def rob(self, nums):\n        def line(arr):\n            take = skip = 0\n            for value in arr:\n                take, skip = skip + value, max(take, skip)\n            return max(take, skip)\n        return nums[0] if len(nums) == 1 else max(line(nums[1:]), line(nums[:-1]))\n```", "class Solution:\n    def rob(self, nums):\n        pass"),
  makeProblem(103, "longest-palindromic-substring", "Longest Palindromic Substring", "Medium", ["Two Pointers", "String", "Dynamic Programming"], "longestPalindrome",
    [caseFrom({ s: "bananas" }, "anana"), caseFrom({ s: "cbbd" }, "bb"), caseFrom({ s: "a" }, "a")],
    (seed) => { const s = stringSamples[seed % stringSamples.length]; return caseFrom({ s }, longestPal(s)); },
    "Return a longest contiguous substring that is a palindrome.",
    ["Input: s = bananas\nOutput: anana", "Input: s = cbbd\nOutput: bb", "Input: s = a\nOutput: a"],
    "```python\nclass Solution:\n    def longestPalindrome(self, s):\n        best = ''\n        def expand(l, r):\n            nonlocal best\n            while l >= 0 and r < len(s) and s[l] == s[r]:\n                l -= 1; r += 1\n            if r - l - 1 > len(best): best = s[l + 1:r]\n        for i in range(len(s)):\n            expand(i, i); expand(i, i + 1)\n        return best\n```", "class Solution:\n    def longestPalindrome(self, s):\n        pass", palindromeChecker),
  makeProblem(104, "palindromic-substrings", "Palindromic Substrings", "Medium", ["Two Pointers", "String", "Dynamic Programming"], "countSubstrings",
    [caseFrom({ s: "aaa" }, 6), caseFrom({ s: "abc" }, 3), caseFrom({ s: "abba" }, 6)],
    (seed) => { const s = stringSamples[seed % stringSamples.length]; return caseFrom({ s }, countPals(s)); },
    "Count all palindromic substrings in `s`, including duplicates at different positions.",
    ["Input: s = aaa\nOutput: 6", "Input: s = abc\nOutput: 3", "Input: s = abba\nOutput: 6"],
    "```python\nclass Solution:\n    def countSubstrings(self, s):\n        total = 0\n        def expand(l, r):\n            nonlocal total\n            while l >= 0 and r < len(s) and s[l] == s[r]:\n                total += 1; l -= 1; r += 1\n        for i in range(len(s)):\n            expand(i, i); expand(i, i + 1)\n        return total\n```", "class Solution:\n    def countSubstrings(self, s):\n        pass"),
  makeProblem(105, "decode-ways", "Decode Ways", "Medium", ["String", "Dynamic Programming"], "numDecodings",
    [caseFrom({ s: "226" }, 3), caseFrom({ s: "06" }, 0), caseFrom({ s: "11106" }, 2)],
    (seed) => { const samples = ["12", "226", "101", "2101", "261105", "30", "111111"]; const s = samples[seed % samples.length]; return caseFrom({ s }, decodeWays(s)); },
    "Digits map to letters `1` through `26`. Return how many valid decodings exist.",
    ["Input: s = 226\nOutput: 3", "Input: s = 06\nOutput: 0", "Input: s = 11106\nOutput: 2"],
    "```python\nclass Solution:\n    def numDecodings(self, s):\n        if not s or s[0] == '0': return 0\n        prev2 = prev1 = 1\n        for i in range(1, len(s)):\n            cur = 0\n            if s[i] != '0': cur += prev1\n            if 10 <= int(s[i-1:i+1]) <= 26: cur += prev2\n            prev2, prev1 = prev1, cur\n        return prev1\n```", "class Solution:\n    def numDecodings(self, s):\n        pass"),
  makeProblem(106, "coin-change", "Coin Change", "Medium", ["Array", "Dynamic Programming", "Breadth-First Search"], "coinChange",
    [caseFrom({ coins: [1, 2, 5], amount: 11 }, 3), caseFrom({ coins: [2], amount: 3 }, -1), caseFrom({ coins: [7], amount: 0 }, 0)],
    (seed) => { const coins = [...new Set(posNums(seed, 2 + (seed % 5), 10))]; const amount = seed % 35; return caseFrom({ coins, amount }, coinChange(coins, amount)); },
    "Return the fewest coins needed to make `amount`, or `-1` when impossible.",
    ["Input: coins = [1,2,5], amount = 11\nOutput: 3", "Input: coins = [2], amount = 3\nOutput: -1", "Input: coins = [7], amount = 0\nOutput: 0"],
    "```python\nclass Solution:\n    def coinChange(self, coins, amount):\n        dp = [0] + [float('inf')] * amount\n        for value in range(1, amount + 1):\n            dp[value] = min((dp[value - coin] + 1 for coin in coins if coin <= value), default=float('inf'))\n        return -1 if dp[amount] == float('inf') else dp[amount]\n```", "class Solution:\n    def coinChange(self, coins, amount):\n        pass"),
  makeProblem(107, "maximum-product-subarray", "Maximum Product Subarray", "Medium", ["Array", "Dynamic Programming"], "maxProduct",
    [caseFrom({ nums: [2, 3, -2, 4] }, 6), caseFrom({ nums: [-2, 0, -1] }, 0), caseFrom({ nums: [-2, 3, -4] }, 24)],
    (seed) => { const arr = nums(seed, 2 + (seed % 9), -5, 11); return caseFrom({ nums: arr }, maxProduct(arr)); },
    "Return the largest product of a non-empty contiguous subarray.",
    ["Input: nums = [2,3,-2,4]\nOutput: 6", "Input: nums = [-2,0,-1]\nOutput: 0", "Input: nums = [-2,3,-4]\nOutput: 24"],
    "```python\nclass Solution:\n    def maxProduct(self, nums):\n        best = hi = lo = nums[0]\n        for value in nums[1:]:\n            hi, lo = max(value, hi * value, lo * value), min(value, hi * value, lo * value)\n            best = max(best, hi)\n        return best\n```", "class Solution:\n    def maxProduct(self, nums):\n        pass"),
  makeProblem(108, "word-break", "Word Break", "Medium", ["Array", "Hash Table", "String", "Dynamic Programming", "Trie"], "wordBreak",
    [caseFrom({ s: "leetcode", wordDict: ["leet", "code"] }, true), caseFrom({ s: "applepenapple", wordDict: ["apple", "pen"] }, true), caseFrom({ s: "catsandog", wordDict: ["cats", "dog", "sand", "and", "cat"] }, false)],
    (seed) => { const dict = ["leet", "code", "pen", "apple", "sand", "cat", "dog"]; const s = seed % 3 === 0 ? "catsandog" : (seed % 2 ? "leetcode" : "applepenapple"); return caseFrom({ s, wordDict: dict }, wordBreak(s, dict)); },
    "Return whether `s` can be segmented into dictionary words.",
    ["Input: s = leetcode, wordDict = [leet,code]\nOutput: true", "Input: s = applepenapple, wordDict = [apple,pen]\nOutput: true", "Input: s = catsandog, wordDict = [cats,dog,sand,and,cat]\nOutput: false"],
    "```python\nclass Solution:\n    def wordBreak(self, s, wordDict):\n        words = set(wordDict)\n        dp = [False] * (len(s) + 1)\n        dp[0] = True\n        for i in range(1, len(s) + 1):\n            dp[i] = any(dp[j] and s[j:i] in words for j in range(i))\n        return dp[-1]\n```", "class Solution:\n    def wordBreak(self, s, wordDict):\n        pass"),
  makeProblem(109, "longest-increasing-subsequence", "Longest Increasing Subsequence", "Medium", ["Array", "Binary Search", "Dynamic Programming"], "lengthOfLIS",
    [caseFrom({ nums: [10, 9, 2, 5, 3, 7, 101, 18] }, 4), caseFrom({ nums: [0, 1, 0, 3, 2, 3] }, 4), caseFrom({ nums: [7, 7, 7] }, 1)],
    (seed) => { const arr = nums(seed, 4 + (seed % 12), -8, 25); return caseFrom({ nums: arr }, lis(arr)); },
    "Return the length of the longest strictly increasing subsequence.",
    ["Input: nums = [10,9,2,5,3,7,101,18]\nOutput: 4", "Input: nums = [0,1,0,3,2,3]\nOutput: 4", "Input: nums = [7,7,7]\nOutput: 1"],
    "```python\nimport bisect\n\nclass Solution:\n    def lengthOfLIS(self, nums):\n        tails = []\n        for value in nums:\n            i = bisect.bisect_left(tails, value)\n            if i == len(tails): tails.append(value)\n            else: tails[i] = value\n        return len(tails)\n```", "class Solution:\n    def lengthOfLIS(self, nums):\n        pass"),
  makeProblem(110, "partition-equal-subset-sum", "Partition Equal Subset Sum", "Medium", ["Array", "Dynamic Programming"], "canPartition",
    [caseFrom({ nums: [1, 5, 11, 5] }, true), caseFrom({ nums: [1, 2, 3, 5] }, false), caseFrom({ nums: [2, 2, 3, 5] }, false)],
    (seed) => { const arr = posNums(seed, 3 + (seed % 9), 12); return caseFrom({ nums: arr }, canPartition(arr)); },
    "Return whether the array can be split into two subsets with equal sum.",
    ["Input: nums = [1,5,11,5]\nOutput: true", "Input: nums = [1,2,3,5]\nOutput: false", "Input: nums = [2,2,3,5]\nOutput: false"],
    "```python\nclass Solution:\n    def canPartition(self, nums):\n        total = sum(nums)\n        if total % 2: return False\n        target = total // 2\n        possible = {0}\n        for value in nums:\n            possible |= {x + value for x in list(possible) if x + value <= target}\n        return target in possible\n```", "class Solution:\n    def canPartition(self, nums):\n        pass"),
  makeProblem(111, "unique-paths", "Unique Paths", "Medium", ["Math", "Dynamic Programming", "Combinatorics"], "uniquePaths",
    [caseFrom({ m: 3, n: 7 }, 28), caseFrom({ m: 3, n: 2 }, 3), caseFrom({ m: 1, n: 5 }, 1)],
    (seed) => { const m = 1 + (seed % 10), n = 1 + ((seed * 2) % 10); return caseFrom({ m, n }, uniquePaths(m, n)); },
    "A robot moves only right or down through an `m x n` grid. Return the number of paths from top-left to bottom-right.",
    ["Input: m = 3, n = 7\nOutput: 28", "Input: m = 3, n = 2\nOutput: 3", "Input: m = 1, n = 5\nOutput: 1"],
    "```python\nclass Solution:\n    def uniquePaths(self, m, n):\n        dp = [1] * n\n        for _ in range(1, m):\n            for c in range(1, n): dp[c] += dp[c - 1]\n        return dp[-1]\n```", "class Solution:\n    def uniquePaths(self, m, n):\n        pass"),
  makeProblem(112, "longest-common-subsequence", "Longest Common Subsequence", "Medium", ["String", "Dynamic Programming"], "longestCommonSubsequence",
    [caseFrom({ text1: "abcde", text2: "ace" }, 3), caseFrom({ text1: "abc", text2: "abc" }, 3), caseFrom({ text1: "abc", text2: "def" }, 0)],
    (seed) => { const a = ["abcde","algorithm","dynamic","subsequence"][seed % 4], b = ["ace","rhythm","program","sequence"][seed % 4]; return caseFrom({ text1: a, text2: b }, lcs(a, b)); },
    "Return the length of the longest sequence that appears in both strings in the same relative order.",
    ["Input: text1 = abcde, text2 = ace\nOutput: 3", "Input: text1 = abc, text2 = abc\nOutput: 3", "Input: text1 = abc, text2 = def\nOutput: 0"],
    "```python\nclass Solution:\n    def longestCommonSubsequence(self, text1, text2):\n        dp = [0] * (len(text2) + 1)\n        for i in range(len(text1) - 1, -1, -1):\n            prev = 0\n            for j in range(len(text2) - 1, -1, -1):\n                old = dp[j]\n                dp[j] = 1 + prev if text1[i] == text2[j] else max(dp[j], dp[j + 1])\n                prev = old\n        return dp[0]\n```", "class Solution:\n    def longestCommonSubsequence(self, text1, text2):\n        pass"),
  makeProblem(113, "best-time-to-buy-and-sell-stock-with-cooldown", "Best Time to Buy and Sell Stock with Cooldown", "Medium", ["Array", "Dynamic Programming"], "maxProfit",
    [caseFrom({ prices: [1, 2, 3, 0, 2] }, 3), caseFrom({ prices: [1] }, 0), caseFrom({ prices: [6, 1, 6, 4, 3, 0, 2] }, 7)],
    (seed) => { const prices = posNums(seed, 1 + (seed % 10), 20); return caseFrom({ prices }, stockCooldown(prices)); },
    "You may buy and sell repeatedly, but after selling you must wait one day before buying again. Return maximum profit.",
    ["Input: prices = [1,2,3,0,2]\nOutput: 3", "Input: prices = [1]\nOutput: 0", "Input: prices = [6,1,6,4,3,0,2]\nOutput: 7"],
    "```python\nclass Solution:\n    def maxProfit(self, prices):\n        hold, sold, rest = float('-inf'), 0, 0\n        for price in prices:\n            old_sold = sold\n            sold = hold + price\n            hold = max(hold, rest - price)\n            rest = max(rest, old_sold)\n        return max(sold, rest)\n```", "class Solution:\n    def maxProfit(self, prices):\n        pass"),
  makeProblem(114, "coin-change-ii", "Coin Change II", "Medium", ["Array", "Dynamic Programming"], "change",
    [caseFrom({ amount: 5, coins: [1, 2, 5] }, 4), caseFrom({ amount: 3, coins: [2] }, 0), caseFrom({ amount: 10, coins: [10] }, 1)],
    (seed) => { const coins = [...new Set(posNums(seed, 2 + (seed % 5), 10))]; const amount = seed % 30; return caseFrom({ amount, coins }, coinChange2(amount, coins)); },
    "Return how many combinations of coins make exactly `amount`. Coin order does not create a new combination.",
    ["Input: amount = 5, coins = [1,2,5]\nOutput: 4", "Input: amount = 3, coins = [2]\nOutput: 0", "Input: amount = 10, coins = [10]\nOutput: 1"],
    "```python\nclass Solution:\n    def change(self, amount, coins):\n        dp = [0] * (amount + 1)\n        dp[0] = 1\n        for coin in coins:\n            for value in range(coin, amount + 1): dp[value] += dp[value - coin]\n        return dp[amount]\n```", "class Solution:\n    def change(self, amount, coins):\n        pass"),
  makeProblem(115, "target-sum", "Target Sum", "Medium", ["Array", "Dynamic Programming", "Backtracking"], "findTargetSumWays",
    [caseFrom({ nums: [1, 1, 1, 1, 1], target: 3 }, 5), caseFrom({ nums: [1], target: 1 }, 1), caseFrom({ nums: [2, 3, 5], target: 0 }, 2)],
    (seed) => { const arr = posNums(seed, 1 + (seed % 8), 6); const target = (seed % 9) - 4; return caseFrom({ nums: arr, target }, targetSumWays(arr, target)); },
    "Assign `+` or `-` before each number. Return the number of assignments whose sum is `target`.",
    ["Input: nums = [1,1,1,1,1], target = 3\nOutput: 5", "Input: nums = [1], target = 1\nOutput: 1", "Input: nums = [2,3,5], target = 0\nOutput: 2"],
    "```python\nfrom collections import Counter\n\nclass Solution:\n    def findTargetSumWays(self, nums, target):\n        counts = Counter({0: 1})\n        for value in nums:\n            nxt = Counter()\n            for total, count in counts.items():\n                nxt[total + value] += count\n                nxt[total - value] += count\n            counts = nxt\n        return counts[target]\n```", "class Solution:\n    def findTargetSumWays(self, nums, target):\n        pass"),
  makeProblem(116, "interleaving-string", "Interleaving String", "Medium", ["String", "Dynamic Programming"], "isInterleave",
    [caseFrom({ s1: "aabcc", s2: "dbbca", s3: "aadbbcbcac" }, true), caseFrom({ s1: "aabcc", s2: "dbbca", s3: "aadbbbaccc" }, false), caseFrom({ s1: "", s2: "", s3: "" }, true)],
    (seed) => { const a = seed % 2 ? "abc" : "aa", b = seed % 2 ? "def" : "ab"; const c = seed % 3 === 0 ? a + b.slice(1) : [...a].map((ch, i) => ch + (b[i] ?? "")).join("") + b.slice(a.length); return caseFrom({ s1: a, s2: b, s3: c }, interleave(a, b, c)); },
    "Return whether `s3` is formed by interleaving `s1` and `s2` while preserving each string's internal order.",
    ["Input: s1 = aabcc, s2 = dbbca, s3 = aadbbcbcac\nOutput: true", "Input: s1 = aabcc, s2 = dbbca, s3 = aadbbbaccc\nOutput: false", "Input: s1 = \"\", s2 = \"\", s3 = \"\"\nOutput: true"],
    "```python\nclass Solution:\n    def isInterleave(self, s1, s2, s3):\n        if len(s1) + len(s2) != len(s3): return False\n        dp = [False] * (len(s2) + 1)\n        dp[0] = True\n        for i in range(len(s1) + 1):\n            for j in range(len(s2) + 1):\n                if i == j == 0: continue\n                take1 = i > 0 and dp[j] and s1[i - 1] == s3[i + j - 1]\n                take2 = j > 0 and dp[j - 1] and s2[j - 1] == s3[i + j - 1]\n                dp[j] = take1 or take2\n        return dp[-1]\n```", "class Solution:\n    def isInterleave(self, s1, s2, s3):\n        pass"),
  makeProblem(117, "longest-increasing-path-in-a-matrix", "Longest Increasing Path in a Matrix", "Hard", ["Array", "Dynamic Programming", "Depth-First Search", "Breadth-First Search", "Graph", "Topological Sort", "Memoization", "Matrix"], "longestIncreasingPath",
    [caseFrom({ matrix: [[9, 9, 4], [6, 6, 8], [2, 1, 1]] }, 4), caseFrom({ matrix: [[3, 4, 5], [3, 2, 6], [2, 2, 1]] }, 4), caseFrom({ matrix: [[1]] }, 1)],
    (seed) => { const m = matrix(seed); return caseFrom({ matrix: m }, lip(m)); },
    "Return the length of the longest path of strictly increasing values, moving up, down, left, or right.",
    ["Input: matrix = [[9,9,4],[6,6,8],[2,1,1]]\nOutput: 4", "Input: matrix = [[3,4,5],[3,2,6],[2,2,1]]\nOutput: 4", "Input: matrix = [[1]]\nOutput: 1"],
    "```python\nclass Solution:\n    def longestIncreasingPath(self, matrix):\n        rows, cols = len(matrix), len(matrix[0])\n        memo = {}\n        def dfs(r, c):\n            if (r, c) in memo: return memo[(r, c)]\n            best = 1\n            for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):\n                nr, nc = r + dr, c + dc\n                if 0 <= nr < rows and 0 <= nc < cols and matrix[nr][nc] > matrix[r][c]:\n                    best = max(best, 1 + dfs(nr, nc))\n            memo[(r, c)] = best\n            return best\n        return max(dfs(r, c) for r in range(rows) for c in range(cols))\n```", "class Solution:\n    def longestIncreasingPath(self, matrix):\n        pass"),
  makeProblem(118, "distinct-subsequences", "Distinct Subsequences", "Hard", ["String", "Dynamic Programming"], "numDistinct",
    [caseFrom({ s: "rabbbit", t: "rabbit" }, 3), caseFrom({ s: "babgbag", t: "bag" }, 5), caseFrom({ s: "abc", t: "abcd" }, 0)],
    (seed) => { const pairs = [["rabbbit","rabbit"],["babgbag","bag"],["aaaaa","aa"],["abcabc","abc"]]; const [s, t] = pairs[seed % pairs.length]; return caseFrom({ s, t }, distinct(s, t)); },
    "Return how many distinct subsequences of `s` equal `t`.",
    ["Input: s = rabbbit, t = rabbit\nOutput: 3", "Input: s = babgbag, t = bag\nOutput: 5", "Input: s = abc, t = abcd\nOutput: 0"],
    "```python\nclass Solution:\n    def numDistinct(self, s, t):\n        dp = [0] * (len(t) + 1)\n        dp[0] = 1\n        for ch in s:\n            for i in range(len(t) - 1, -1, -1):\n                if ch == t[i]: dp[i + 1] += dp[i]\n        return dp[-1]\n```", "class Solution:\n    def numDistinct(self, s, t):\n        pass"),
  makeProblem(119, "edit-distance", "Edit Distance", "Medium", ["String", "Dynamic Programming"], "minDistance",
    [caseFrom({ word1: "horse", word2: "ros" }, 3), caseFrom({ word1: "intention", word2: "execution" }, 5), caseFrom({ word1: "", word2: "abc" }, 3)],
    (seed) => { const pairs = [["horse","ros"],["kitten","sitting"],["flaw","lawn"],["abc","abc"],["","code"]]; const [word1, word2] = pairs[seed % pairs.length]; return caseFrom({ word1, word2 }, edit(word1, word2)); },
    "Return the minimum number of insertions, deletions, or replacements needed to convert `word1` into `word2`.",
    ["Input: word1 = horse, word2 = ros\nOutput: 3", "Input: word1 = intention, word2 = execution\nOutput: 5", "Input: word1 = \"\", word2 = abc\nOutput: 3"],
    "```python\nclass Solution:\n    def minDistance(self, word1, word2):\n        prev = list(range(len(word2) + 1))\n        for i, a in enumerate(word1, 1):\n            cur = [i] + [0] * len(word2)\n            for j, b in enumerate(word2, 1):\n                cur[j] = prev[j - 1] if a == b else 1 + min(prev[j], cur[j - 1], prev[j - 1])\n            prev = cur\n        return prev[-1]\n```", "class Solution:\n    def minDistance(self, word1, word2):\n        pass"),
  makeProblem(120, "burst-balloons", "Burst Balloons", "Hard", ["Array", "Dynamic Programming"], "maxCoins",
    [caseFrom({ nums: [3, 1, 5, 8] }, 167), caseFrom({ nums: [1, 5] }, 10), caseFrom({ nums: [7] }, 7)],
    (seed) => { const arr = posNums(seed, 1 + (seed % 6), 8); return caseFrom({ nums: arr }, burst(arr)); },
    "When bursting a balloon, gain `left * current * right` using nearest remaining neighbors. Return the maximum coins.",
    ["Input: nums = [3,1,5,8]\nOutput: 167", "Input: nums = [1,5]\nOutput: 10", "Input: nums = [7]\nOutput: 7"],
    "```python\nclass Solution:\n    def maxCoins(self, nums):\n        arr = [1] + nums + [1]\n        n = len(arr)\n        dp = [[0] * n for _ in range(n)]\n        for length in range(2, n):\n            for left in range(n - length):\n                right = left + length\n                dp[left][right] = max(dp[left][mid] + dp[mid][right] + arr[left] * arr[mid] * arr[right] for mid in range(left + 1, right))\n        return dp[0][n - 1]\n```", "class Solution:\n    def maxCoins(self, nums):\n        pass"),
  makeProblem(121, "regular-expression-matching", "Regular Expression Matching", "Hard", ["String", "Dynamic Programming", "Recursion"], "isMatch",
    [caseFrom({ s: "aa", p: "a" }, false), caseFrom({ s: "aa", p: "a*" }, true), caseFrom({ s: "ab", p: ".*" }, true)],
    (seed) => { const samples = [["aa","a"],["aa","a*"],["ab",".*"],["aab","c*a*b"],["mississippi","mis*is*p*."]]; const [s, p] = samples[seed % samples.length]; return caseFrom({ s, p }, regex(s, p)); },
    "Return whether pattern `p` matches the entire string `s`, where `.` matches any single character and `*` repeats the previous token zero or more times.",
    ["Input: s = aa, p = a\nOutput: false", "Input: s = aa, p = a*\nOutput: true", "Input: s = ab, p = .*\nOutput: true"],
    "```python\nfrom functools import lru_cache\n\nclass Solution:\n    def isMatch(self, s, p):\n        @lru_cache(None)\n        def dp(i, j):\n            if j == len(p): return i == len(s)\n            first = i < len(s) and p[j] in {s[i], '.'}\n            if j + 1 < len(p) and p[j + 1] == '*':\n                return dp(i, j + 2) or (first and dp(i + 1, j))\n            return first and dp(i + 1, j + 1)\n        return dp(0, 0)\n```", "class Solution:\n    def isMatch(self, s, p):\n        pass")
];

for (const problem of problems) writeProblem(problem);

console.log(`Generated ${problems.length} dynamic-programming problem packs.`);
