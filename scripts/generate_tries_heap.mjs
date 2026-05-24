import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const problemsRoot = path.join(root, "problems");
const TARGET_CASES = Number(process.env.ELITECODE_TARGET_CASES ?? 2000);

function writeProblem(spec) {
  const dir = path.join(problemsRoot, spec.slug);
  fs.mkdirSync(dir, { recursive: true });
  const checker = spec.checker
    ? { type: "python", file: "checker.py" }
    : { type: "exact" };
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

function trieRun(operations, values) {
  const rootNode = {};
  const out = [];
  for (let i = 0; i < operations.length; i += 1) {
    const op = operations[i];
    const word = values[i][0];
    if (op === "Trie") continue;
    if (op === "insert") {
      let node = rootNode;
      for (const ch of word) node = node[ch] ??= {};
      node.$ = true;
    } else if (op === "search" || op === "startsWith") {
      let node = rootNode;
      let ok = true;
      for (const ch of word) {
        if (!node[ch]) {
          ok = false;
          break;
        }
        node = node[ch];
      }
      out.push(ok && (op === "startsWith" || node.$ === true));
    }
  }
  return out;
}

function trieSeed(seed) {
  const words = [`code${seed}`, `coder${seed}`, `cat${seed}`, `car${seed}`];
  const operations = ["Trie", "insert", "insert", "search", "startsWith", "search", "insert", "startsWith", "search"];
  const values = [[], [words[0]], [words[2]], [words[0]], [`co`], [`codex${seed}`], [words[1]], [`coder`], [words[1]]];
  return { operations, values };
}

function wordDictionaryRun(operations, values) {
  const words = [];
  const out = [];
  const matches = (pattern, word) => pattern.length === word.length && [...pattern].every((ch, i) => ch === "." || ch === word[i]);
  for (let i = 0; i < operations.length; i += 1) {
    const op = operations[i];
    const word = values[i][0];
    if (op === "WordDictionary") continue;
    if (op === "addWord") words.push(word);
    if (op === "search") out.push(words.some((item) => matches(word, item)));
  }
  return out;
}

function wordDictionarySeed(seed) {
  const base = [`map${seed}`, `mad${seed}`, `made${seed}`, `mode${seed}`];
  const operations = ["WordDictionary", "addWord", "addWord", "search", "search", "addWord", "search", "search"];
  const values = [[], [base[0]], [base[1]], [`ma.${seed}`], [`m..e${seed}`], [base[2]], [`m..e${seed}`], [`...${seed}`]];
  return { operations, values };
}

function findWords(board, words) {
  const rows = board.length;
  const cols = board[0].length;
  const result = new Set();
  const wordSet = new Set(words);
  function dfs(r, c, prefix, seen) {
    if (r < 0 || c < 0 || r >= rows || c >= cols || seen.has(`${r},${c}`)) return;
    const next = prefix + board[r][c];
    if (![...wordSet].some((word) => word.startsWith(next))) return;
    if (wordSet.has(next)) result.add(next);
    seen.add(`${r},${c}`);
    dfs(r + 1, c, next, seen);
    dfs(r - 1, c, next, seen);
    dfs(r, c + 1, next, seen);
    dfs(r, c - 1, next, seen);
    seen.delete(`${r},${c}`);
  }
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) dfs(r, c, "", new Set());
  }
  return [...result].sort();
}

function wordSearchSeed(seed) {
  const letters = seed % 5 === 0 ? "abc" : "abcdefgxyz";
  const rows = 1 + (mix(seed, 1) % 5);
  const cols = 1 + (mix(seed, 2) % 5);
  const board = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => letters[mix(seed, r * cols + c + 3) % letters.length])
  );
  const words = [board[0].join(""), board.map((row) => row[0]).join("")];
  for (let i = 0; i < Math.min(rows, cols); i += 1) words.push(board[i][i]);
  if (rows > 1 && cols > 1) words.push(`${board[0][0]}${board[0][1]}${board[1][1]}`);
  words.push(Array.from({ length: 2 + (seed % 5) }, (_, i) => "mnopq"[mix(seed, i + 40) % 5]).join(""));
  return { board, words };
}

function kthLargestRun(k, nums, adds) {
  const arr = [...nums].sort((a, b) => b - a);
  const out = [];
  for (const value of adds) {
    arr.push(value);
    arr.sort((a, b) => b - a);
    out.push(arr[k - 1]);
  }
  return out;
}

function kthLargestSeed(seed) {
  const k = 1 + (mix(seed, 50) % 7);
  const nums = Array.from({ length: k + 3 + (mix(seed, 51) % 8) }, (_, i) => (mix(seed, i + 52) % 101) - 50);
  const adds = Array.from({ length: 8 + (mix(seed, 70) % 12) }, (_, i) => (mix(seed, i + 71) % 121) - 60);
  return { k, nums, adds };
}

function lastStone(stones) {
  const arr = [...stones];
  while (arr.length > 1) {
    arr.sort((a, b) => a - b);
    const y = arr.pop();
    const x = arr.pop();
    if (x !== y) arr.push(y - x);
  }
  return arr[0] ?? 0;
}

function stoneSeed(seed) {
  return Array.from({ length: 1 + (mix(seed, 90) % 18) }, (_, i) => 1 + (mix(seed, i + 91) % 100));
}

function kClosest(points, k) {
  return [...points].sort((a, b) => (a[0] ** 2 + a[1] ** 2) - (b[0] ** 2 + b[1] ** 2)).slice(0, k);
}

function pointsSeed(seed) {
  const points = [];
  const used = new Set();
  for (let i = 0; points.length < 8 + (seed % 6); i += 1) {
    const x = ((seed * 19 + i * 7) % 31) - 15;
    const y = ((seed * 23 + i * 11) % 29) - 14;
    const dist = x * x + y * y;
    if (!used.has(dist)) {
      used.add(dist);
      points.push([x, y]);
    }
  }
  return points;
}

function kthLargestArray(nums, k) {
  return [...nums].sort((a, b) => b - a)[k - 1];
}

function numberArray(seed, length = 8 + (seed % 15)) {
  return Array.from({ length }, (_, i) => ((seed * 29 + i * 17) % 101) - 50);
}

function leastInterval(tasks, n) {
  const counts = new Map();
  for (const task of tasks) counts.set(task, (counts.get(task) ?? 0) + 1);
  const maxCount = Math.max(...counts.values());
  const maxKinds = [...counts.values()].filter((value) => value === maxCount).length;
  return Math.max(tasks.length, (maxCount - 1) * (n + 1) + maxKinds);
}

function tasksSeed(seed) {
  const letters = "ABCDE";
  return Array.from({ length: 8 + (seed % 18) }, (_, i) => letters[(seed + i * i) % letters.length]);
}

function twitterRun(operations, values) {
  let time = 0;
  const tweets = new Map();
  const follows = new Map();
  const out = [];
  const followSet = (user) => {
    if (!follows.has(user)) follows.set(user, new Set([user]));
    follows.get(user).add(user);
    return follows.get(user);
  };
  for (let i = 0; i < operations.length; i += 1) {
    const op = operations[i];
    const args = values[i];
    if (op === "Twitter") {
      tweets.clear();
      follows.clear();
      time = 0;
    } else if (op === "postTweet") {
      const [userId, tweetId] = args;
      if (!tweets.has(userId)) tweets.set(userId, []);
      tweets.get(userId).push([time++, tweetId]);
      followSet(userId);
    } else if (op === "follow") {
      followSet(args[0]).add(args[1]);
    } else if (op === "unfollow") {
      if (args[0] !== args[1]) followSet(args[0]).delete(args[1]);
    } else if (op === "getNewsFeed") {
      const feed = [];
      for (const user of followSet(args[0])) feed.push(...(tweets.get(user) ?? []));
      feed.sort((a, b) => b[0] - a[0]);
      out.push(feed.slice(0, 10).map((item) => item[1]));
    }
  }
  return out;
}

function twitterSeed(seed) {
  const operations = ["Twitter"];
  const values = [[]];
  for (let i = 0; i < 16 + (seed % 8); i += 1) {
    const user = 1 + ((seed + i) % 4);
    if (i % 5 === 0) {
      operations.push("follow");
      values.push([user, 1 + ((user + seed) % 4)]);
    } else if (i % 7 === 0) {
      operations.push("unfollow");
      values.push([user, 1 + ((user + 1) % 4)]);
    } else if (i % 4 === 0) {
      operations.push("getNewsFeed");
      values.push([user]);
    } else {
      operations.push("postTweet");
      values.push([user, seed * 100 + i]);
    }
  }
  operations.push("getNewsFeed");
  values.push([1 + (seed % 4)]);
  return { operations, values };
}

function medianRun(operations, values) {
  const nums = [];
  const out = [];
  for (let i = 0; i < operations.length; i += 1) {
    const op = operations[i];
    if (op === "MedianFinder") continue;
    if (op === "addNum") nums.push(values[i][0]);
    if (op === "findMedian") {
      const sorted = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      out.push(sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2);
    }
  }
  return out;
}

function medianSeed(seed) {
  const operations = ["MedianFinder"];
  const values = [[]];
  for (let i = 0; i < 14 + (seed % 6); i += 1) {
    operations.push("addNum");
    values.push([((seed * 31 + i * 13) % 80) - 40]);
    if (i % 2 === 1 || i === 0) {
      operations.push("findMedian");
      values.push([]);
    }
  }
  return { operations, values };
}

const unorderedWordsChecker = `
from __future__ import annotations

from typing import Any


def check(input_data: dict[str, Any], expected: list[str], actual: Any) -> dict[str, Any]:
    if not isinstance(actual, list) or not all(isinstance(item, str) for item in actual):
        return {"passed": False, "message": "Expected a list of words."}
    return {"passed": sorted(actual) == sorted(expected), "message": ""}
`;

const unorderedPointsChecker = `
from __future__ import annotations

from typing import Any


def check(input_data: dict[str, Any], expected: list[list[int]], actual: Any) -> dict[str, Any]:
    if not isinstance(actual, list):
        return {"passed": False, "message": "Expected a list of points."}
    try:
        normalize = lambda points: sorted([tuple(point) for point in points])
        return {"passed": normalize(actual) == normalize(expected), "message": ""}
    except TypeError:
        return {"passed": False, "message": "Every point must be a pair of integers."}
`;

const problems = [
  (() => {
    const visibleOps = [
      [["Trie", "insert", "search", "search", "startsWith", "insert", "search"], [[], ["orbit"], ["orbit"], ["orb"], ["orb"], ["orb"], ["orb"]]],
      [["Trie", "insert", "insert", "startsWith", "search"], [[], ["stone"], ["stove"], ["sto"], ["store"]]],
      [["Trie", "search", "startsWith"], [[], ["empty"], ["e"]]]
    ];
    const visible = visibleOps.map(([operations, values]) => caseFrom({ operations, values }, trieRun(operations, values)));
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const { operations, values } = trieSeed(seed);
      return caseFrom({ operations, values }, trieRun(operations, values));
    });
    return {
      id: 61,
      slug: "implement-trie-prefix-tree",
      title: "Implement Trie (Prefix Tree)",
      difficulty: "Medium",
      tags: ["Hash Table", "String", "Design", "Trie"],
      method: "trieOps",
      visible: visibleCount,
      cases,
      statement: markdown("Implement Trie (Prefix Tree)", "Implement a trie supporting `insert`, exact `search`, and `startsWith`. The judge calls `trieOps(operations, values)` and compares outputs from query operations.", ["Input: insert orbit, search orbit, search orb, startsWith orb, insert orb, search orb\nOutput: [true,false,true,true]", "Input: insert stone, insert stove, startsWith sto, search store\nOutput: [true,false]", "Input: search empty, startsWith e\nOutput: [false,false]"], ["Words contain lowercase letters and optional digits in generated tests.", "Operations are supplied as parallel arrays."]),
      editorial: "Each trie node maps a character to a child node and stores whether a word ends there.",
      solution: "```python\nclass Trie:\n    def __init__(self):\n        self.children = {}\n        self.end = False\n\n    def insert(self, word):\n        node = self\n        for ch in word:\n            node = node.children.setdefault(ch, Trie())\n        node.end = True\n\n    def search(self, word):\n        node = self\n        for ch in word:\n            if ch not in node.children:\n                return False\n            node = node.children[ch]\n        return node.end\n\n    def startsWith(self, prefix):\n        node = self\n        for ch in prefix:\n            if ch not in node.children:\n                return False\n            node = node.children[ch]\n        return True\n\nclass Solution:\n    def trieOps(self, operations, values):\n        trie = None\n        out = []\n        for op, args in zip(operations, values):\n            if op == 'Trie':\n                trie = Trie()\n            elif op == 'insert':\n                trie.insert(args[0])\n            elif op == 'search':\n                out.append(trie.search(args[0]))\n            elif op == 'startsWith':\n                out.append(trie.startsWith(args[0]))\n        return out\n```",
      hints: ["A word ending marker is different from a prefix existing.", "Create child nodes only when inserting."],
      starter: "class Trie:\n    def __init__(self):\n        pass\n\n    def insert(self, word):\n        pass\n\n    def search(self, word):\n        pass\n\n    def startsWith(self, prefix):\n        pass\n\nclass Solution:\n    def trieOps(self, operations, values):\n        pass"
    };
  })(),
  (() => {
    const visibleOps = [
      [["WordDictionary", "addWord", "addWord", "search", "search", "search"], [[], ["bad"], ["bag"], ["b.d"], ["ba."], ["b..e"]]],
      [["WordDictionary", "addWord", "search", "search"], [[], ["code"], ["c.de"], ["...."]]],
      [["WordDictionary", "search"], [[], ["."]]]
    ];
    const visible = visibleOps.map(([operations, values]) => caseFrom({ operations, values }, wordDictionaryRun(operations, values)));
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const { operations, values } = wordDictionarySeed(seed);
      return caseFrom({ operations, values }, wordDictionaryRun(operations, values));
    });
    return {
      id: 62,
      slug: "add-and-search-word-data-structure-design",
      title: "Design Add and Search Words Data Structure",
      difficulty: "Medium",
      tags: ["String", "Depth-First Search", "Design", "Trie"],
      method: "wordDictionary",
      visible: visibleCount,
      cases,
      statement: markdown("Design Add and Search Words Data Structure", "Design a word dictionary that supports adding words and searching patterns where `.` matches any single character. The judge calls `wordDictionary(operations, values)` and compares outputs from `search`.", ["Input: add bad, add bag, search b.d, search ba., search b..e\nOutput: [true,true,false]", "Input: add code, search c.de, search ....\nOutput: [true,true]", "Input: search .\nOutput: [false]"], ["Words and patterns contain lowercase letters, digits, or `.`.", "`search` patterns match the whole word length."]),
      editorial: "Store words in a trie. During search, a literal follows one child while `.` branches to every child.",
      solution: "```python\nclass WordDictionary:\n    def __init__(self):\n        self.children = {}\n        self.end = False\n\n    def addWord(self, word):\n        node = self\n        for ch in word:\n            node = node.children.setdefault(ch, WordDictionary())\n        node.end = True\n\n    def search(self, word):\n        def dfs(index, node):\n            if index == len(word):\n                return node.end\n            ch = word[index]\n            if ch == '.':\n                return any(dfs(index + 1, child) for child in node.children.values())\n            return ch in node.children and dfs(index + 1, node.children[ch])\n        return dfs(0, self)\n\nclass Solution:\n    def wordDictionary(self, operations, values):\n        wd = None\n        out = []\n        for op, args in zip(operations, values):\n            if op == 'WordDictionary':\n                wd = WordDictionary()\n            elif op == 'addWord':\n                wd.addWord(args[0])\n            elif op == 'search':\n                out.append(wd.search(args[0]))\n        return out\n```",
      hints: ["A wildcard search can fan out to several children.", "The pattern must consume all characters and end on a stored word."],
      starter: "class WordDictionary:\n    def __init__(self):\n        pass\n\n    def addWord(self, word):\n        pass\n\n    def search(self, word):\n        pass\n\nclass Solution:\n    def wordDictionary(self, operations, values):\n        pass"
    };
  })(),
  (() => {
    const visibleRaw = [
      { board: [["o", "a", "t"], ["e", "t", "a"], ["i", "h", "k"]], words: ["oat", "eat", "tea", "hat", "rain"] },
      { board: [["a", "b"], ["c", "d"]], words: ["ab", "abcd", "ac", "bd"] },
      { board: [["x"]], words: ["x", "xx"] }
    ];
    const visible = visibleRaw.map(({ board, words }) => caseFrom({ board, words }, findWords(board, words)));
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const { board, words } = wordSearchSeed(seed);
      return caseFrom({ board, words }, findWords(board, words));
    });
    return {
      id: 63,
      slug: "word-search-ii",
      title: "Word Search II",
      difficulty: "Hard",
      tags: ["Array", "String", "Backtracking", "Trie", "Matrix"],
      method: "findWords",
      visible: visibleCount,
      cases,
      checker: unorderedWordsChecker,
      statement: markdown("Word Search II", "Given a character board and a list of words, return every word that can be formed by walking horizontally or vertically through adjacent cells without reusing a cell in the same word.", ["Input: board = [[o,a,t],[e,t,a],[i,h,k]], words = [oat,eat,tea,hat,rain]\nOutput: [eat,oat,tea]", "Input: board = [[a,b],[c,d]], words = [ab,abcd,ac,bd]\nOutput: [ab,ac,bd]", "Input: board = [[x]], words = [x,xx]\nOutput: [x]"], ["`1 <= rows, cols`", "Words contain lowercase letters.", "Output order is ignored by the checker."]),
      editorial: "Build a trie of candidate words, then DFS from each board cell while pruning paths that are not trie prefixes.",
      solution: "```python\nclass Solution:\n    def findWords(self, board, words):\n        trie = {}\n        for word in words:\n            node = trie\n            for ch in word:\n                node = node.setdefault(ch, {})\n            node['$'] = word\n        rows, cols = len(board), len(board[0])\n        found = set()\n        def dfs(r, c, node):\n            if r < 0 or c < 0 or r == rows or c == cols:\n                return\n            ch = board[r][c]\n            if ch == '#' or ch not in node:\n                return\n            nxt = node[ch]\n            if '$' in nxt:\n                found.add(nxt['$'])\n            board[r][c] = '#'\n            dfs(r + 1, c, nxt)\n            dfs(r - 1, c, nxt)\n            dfs(r, c + 1, nxt)\n            dfs(r, c - 1, nxt)\n            board[r][c] = ch\n        for r in range(rows):\n            for c in range(cols):\n                dfs(r, c, trie)\n        return sorted(found)\n```",
      hints: ["Searching each word independently repeats a lot of prefix work.", "Prune DFS as soon as the current path is not in the trie."],
      starter: "class Solution:\n    def findWords(self, board, words):\n        pass"
    };
  })(),
  (() => {
    const visibleRaw = [
      { k: 3, nums: [4, 5, 8, 2], adds: [3, 5, 10, 9, 4] },
      { k: 1, nums: [], adds: [6, -1, 7] },
      { k: 2, nums: [9, 1], adds: [0, 10] }
    ];
    const visible = visibleRaw.map(({ k, nums, adds }) => caseFrom({ k, nums, adds }, kthLargestRun(k, nums, adds)));
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const { k, nums, adds } = kthLargestSeed(seed);
      return caseFrom({ k, nums, adds }, kthLargestRun(k, nums, adds));
    });
    return {
      id: 64,
      slug: "kth-largest-element-in-a-stream",
      title: "Kth Largest Element in a Stream",
      difficulty: "Easy",
      tags: ["Tree", "Design", "Heap", "Binary Search Tree", "Data Stream"],
      method: "kthLargest",
      visible: visibleCount,
      cases,
      statement: markdown("Kth Largest Element in a Stream", "Maintain the kth largest value after each added number. The judge calls `kthLargest(k, nums, adds)` and expects one output per added value.", ["Input: k = 3, nums = [4,5,8,2], adds = [3,5,10,9,4]\nOutput: [4,5,5,8,8]", "Input: k = 1, nums = [], adds = [6,-1,7]\nOutput: [6,6,7]", "Input: k = 2, nums = [9,1], adds = [0,10]\nOutput: [1,9]"], ["`1 <= k`", "The stream eventually contains at least `k` values."]),
      editorial: "Keep a min-heap of the largest `k` values seen. The heap root is the kth largest.",
      solution: "```python\nimport heapq\n\nclass KthLargest:\n    def __init__(self, k, nums):\n        self.k = k\n        self.heap = nums[:]\n        heapq.heapify(self.heap)\n        while len(self.heap) > k:\n            heapq.heappop(self.heap)\n\n    def add(self, val):\n        heapq.heappush(self.heap, val)\n        if len(self.heap) > self.k:\n            heapq.heappop(self.heap)\n        return self.heap[0]\n\nclass Solution:\n    def kthLargest(self, k, nums, adds):\n        obj = KthLargest(k, nums)\n        return [obj.add(value) for value in adds]\n```",
      hints: ["Only the largest k values can affect the answer.", "The smallest among those k values is the kth largest overall."],
      starter: "class KthLargest:\n    def __init__(self, k, nums):\n        pass\n\n    def add(self, val):\n        pass\n\nclass Solution:\n    def kthLargest(self, k, nums, adds):\n        pass"
    };
  })(),
  (() => {
    const visibleRaw = [[2, 7, 4, 1, 8, 1], [10], [5, 5, 5, 5]];
    const visible = visibleRaw.map((stones) => caseFrom({ stones }, lastStone(stones)));
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const stones = stoneSeed(seed);
      return caseFrom({ stones }, lastStone(stones));
    });
    return {
      id: 65,
      slug: "last-stone-weight",
      title: "Last Stone Weight",
      difficulty: "Easy",
      tags: ["Array", "Heap"],
      method: "lastStoneWeight",
      visible: visibleCount,
      cases,
      statement: markdown("Last Stone Weight", "Repeatedly smash the two heaviest stones. Equal stones both disappear; otherwise the leftover weight is the difference. Return the final weight or zero.", ["Input: stones = [2,7,4,1,8,1]\nOutput: 1", "Input: stones = [10]\nOutput: 10", "Input: stones = [5,5,5,5]\nOutput: 0"], ["`1 <= stones.length`", "Stone weights are positive integers."]),
      editorial: "A max-heap repeatedly exposes the two largest stones. Python's `heapq` can be used with negated weights.",
      solution: "```python\nimport heapq\n\nclass Solution:\n    def lastStoneWeight(self, stones):\n        heap = [-stone for stone in stones]\n        heapq.heapify(heap)\n        while len(heap) > 1:\n            y = -heapq.heappop(heap)\n            x = -heapq.heappop(heap)\n            if y != x:\n                heapq.heappush(heap, -(y - x))\n        return -heap[0] if heap else 0\n```",
      hints: ["You need quick access to the largest two values.", "Negating values turns Python's min-heap into a max-heap."],
      starter: "class Solution:\n    def lastStoneWeight(self, stones):\n        pass"
    };
  })(),
  (() => {
    const visibleRaw = [
      { points: [[1, 3], [-2, 2], [4, 5]], k: 2 },
      { points: [[3, 3], [5, -1], [-2, 4]], k: 1 },
      { points: [[0, 2], [2, 0], [4, 4]], k: 2 }
    ];
    const visible = visibleRaw.map(({ points, k }) => caseFrom({ points, k }, kClosest(points, k)));
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const points = pointsSeed(seed);
      const k = 1 + (seed % points.length);
      return caseFrom({ points, k }, kClosest(points, k));
    });
    return {
      id: 66,
      slug: "k-closest-points-to-origin",
      title: "K Closest Points to Origin",
      difficulty: "Medium",
      tags: ["Array", "Math", "Divide and Conquer", "Geometry", "Heap", "Quickselect", "Sorting"],
      method: "kClosest",
      visible: visibleCount,
      cases,
      checker: unorderedPointsChecker,
      statement: markdown("K Closest Points to Origin", "Return the `k` points with the smallest squared distance from `(0, 0)`. Output order is ignored.", ["Input: points = [[1,3],[-2,2],[4,5]], k = 2\nOutput: [[-2,2],[1,3]]", "Input: points = [[3,3],[5,-1],[-2,4]], k = 1\nOutput: [[3,3]]", "Input: points = [[0,2],[2,0],[4,4]], k = 2\nOutput: [[0,2],[2,0]]"], ["`1 <= k <= points.length`", "Generated tests avoid distance ties around the answer boundary."]),
      editorial: "Sort by squared distance or keep a heap of candidate points. Squared distance avoids unnecessary square roots.",
      solution: "```python\nclass Solution:\n    def kClosest(self, points, k):\n        return sorted(points, key=lambda point: point[0] * point[0] + point[1] * point[1])[:k]\n```",
      hints: ["Distance comparison does not require a square root.", "The checker ignores the order of the returned points."],
      starter: "class Solution:\n    def kClosest(self, points, k):\n        pass"
    };
  })(),
  (() => {
    const visibleRaw = [
      { nums: [3, 2, 1, 5, 6, 4], k: 2 },
      { nums: [9, 9, 1, 4], k: 3 },
      { nums: [-1, -3, -2], k: 1 }
    ];
    const visible = visibleRaw.map(({ nums, k }) => caseFrom({ nums, k }, kthLargestArray(nums, k)));
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const nums = numberArray(seed);
      const k = 1 + (seed % nums.length);
      return caseFrom({ nums, k }, kthLargestArray(nums, k));
    });
    return {
      id: 67,
      slug: "kth-largest-element-in-an-array",
      title: "Kth Largest Element in an Array",
      difficulty: "Medium",
      tags: ["Array", "Divide and Conquer", "Sorting", "Heap", "Quickselect"],
      method: "findKthLargest",
      visible: visibleCount,
      cases,
      statement: markdown("Kth Largest Element in an Array", "Return the kth largest element by sorted order, counting duplicates as separate positions.", ["Input: nums = [3,2,1,5,6,4], k = 2\nOutput: 5", "Input: nums = [9,9,1,4], k = 3\nOutput: 4", "Input: nums = [-1,-3,-2], k = 1\nOutput: -1"], ["`1 <= k <= nums.length`", "Values may repeat."]),
      editorial: "A min-heap of size `k` keeps the largest `k` values, or quickselect can partition around the desired rank.",
      solution: "```python\nimport heapq\n\nclass Solution:\n    def findKthLargest(self, nums, k):\n        heap = []\n        for num in nums:\n            heapq.heappush(heap, num)\n            if len(heap) > k:\n                heapq.heappop(heap)\n        return heap[0]\n```",
      hints: ["Duplicates still occupy positions.", "A size-k heap gives a direct kth-largest root."],
      starter: "class Solution:\n    def findKthLargest(self, nums, k):\n        pass"
    };
  })(),
  (() => {
    const visibleRaw = [
      { tasks: ["A", "A", "A", "B", "B", "B"], n: 2 },
      { tasks: ["A", "B", "C", "A"], n: 0 },
      { tasks: ["A", "A", "A", "B", "C", "D"], n: 3 }
    ];
    const visible = visibleRaw.map(({ tasks, n }) => caseFrom({ tasks, n }, leastInterval(tasks, n)));
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const tasks = tasksSeed(seed);
      const n = seed % 5;
      return caseFrom({ tasks, n }, leastInterval(tasks, n));
    });
    return {
      id: 68,
      slug: "task-scheduler",
      title: "Task Scheduler",
      difficulty: "Medium",
      tags: ["Array", "Hash Table", "Greedy", "Sorting", "Heap", "Counting"],
      method: "leastInterval",
      visible: visibleCount,
      cases,
      statement: markdown("Task Scheduler", "Given task labels and a cooldown `n`, return the fewest time slots needed to execute every task so identical labels are separated by at least `n` slots.", ["Input: tasks = [A,A,A,B,B,B], n = 2\nOutput: 8", "Input: tasks = [A,B,C,A], n = 0\nOutput: 4", "Input: tasks = [A,A,A,B,C,D], n = 3\nOutput: 9"], ["Task labels are uppercase letters.", "`0 <= n`"]),
      editorial: "The most frequent tasks define frames of length `n + 1`. The answer is the larger of total tasks and the frame formula.",
      solution: "```python\nfrom collections import Counter\n\nclass Solution:\n    def leastInterval(self, tasks, n):\n        counts = Counter(tasks).values()\n        most = max(counts)\n        tied = sum(1 for count in counts if count == most)\n        return max(len(tasks), (most - 1) * (n + 1) + tied)\n```",
      hints: ["Idle slots are forced only by the most frequent labels.", "Several labels may tie for highest frequency."],
      starter: "class Solution:\n    def leastInterval(self, tasks, n):\n        pass"
    };
  })(),
  (() => {
    const visibleOps = [
      [["Twitter", "postTweet", "getNewsFeed", "follow", "postTweet", "getNewsFeed", "unfollow", "getNewsFeed"], [[], [1, 101], [1], [1, 2], [2, 202], [1], [1, 2], [1]]],
      [["Twitter", "postTweet", "postTweet", "getNewsFeed"], [[], [3, 301], [3, 302], [3]]],
      [["Twitter", "follow", "getNewsFeed"], [[], [1, 2], [1]]]
    ];
    const visible = visibleOps.map(([operations, values]) => caseFrom({ operations, values }, twitterRun(operations, values)));
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const { operations, values } = twitterSeed(seed);
      return caseFrom({ operations, values }, twitterRun(operations, values));
    });
    return {
      id: 69,
      slug: "design-twitter",
      title: "Design Twitter",
      difficulty: "Medium",
      tags: ["Hash Table", "Linked List", "Design", "Heap"],
      method: "twitter",
      visible: visibleCount,
      cases,
      statement: markdown("Design Twitter", "Design a small social feed with `postTweet`, `getNewsFeed`, `follow`, and `unfollow`. A news feed returns up to 10 most recent tweet IDs from the user and followed users. The judge calls `twitter(operations, values)` and compares outputs from `getNewsFeed`.", ["Input: postTweet(1,101), getNewsFeed(1), follow(1,2), postTweet(2,202), getNewsFeed(1), unfollow(1,2), getNewsFeed(1)\nOutput: [[101],[202,101],[101]]", "Input: postTweet(3,301), postTweet(3,302), getNewsFeed(3)\nOutput: [[302,301]]", "Input: follow(1,2), getNewsFeed(1)\nOutput: [[]]"], ["Tweet IDs are integers.", "A user always follows themself for feed purposes."]),
      editorial: "Store each user's tweets with timestamps and each user's follow set. Merge recent tweets from followed users when building the feed.",
      solution: "```python\nfrom collections import defaultdict\nimport heapq\n\nclass Twitter:\n    def __init__(self):\n        self.time = 0\n        self.tweets = defaultdict(list)\n        self.follows = defaultdict(set)\n\n    def postTweet(self, userId, tweetId):\n        self.follows[userId].add(userId)\n        self.tweets[userId].append((self.time, tweetId))\n        self.time += 1\n\n    def getNewsFeed(self, userId):\n        self.follows[userId].add(userId)\n        heap = []\n        for user in self.follows[userId]:\n            for time, tweet in self.tweets[user][-10:]:\n                heapq.heappush(heap, (-time, tweet))\n        return [tweet for _, tweet in heapq.nsmallest(10, heap)]\n\n    def follow(self, followerId, followeeId):\n        self.follows[followerId].add(followerId)\n        self.follows[followerId].add(followeeId)\n\n    def unfollow(self, followerId, followeeId):\n        if followerId != followeeId:\n            self.follows[followerId].discard(followeeId)\n\nclass Solution:\n    def twitter(self, operations, values):\n        obj = None\n        out = []\n        for op, args in zip(operations, values):\n            if op == 'Twitter':\n                obj = Twitter()\n            elif op == 'postTweet':\n                obj.postTweet(*args)\n            elif op == 'getNewsFeed':\n                out.append(obj.getNewsFeed(*args))\n            elif op == 'follow':\n                obj.follow(*args)\n            elif op == 'unfollow':\n                obj.unfollow(*args)\n        return out\n```",
      hints: ["Feeds need recency across several users.", "A user should not lose their own posts when unfollow is called."],
      starter: "class Twitter:\n    def __init__(self):\n        pass\n\n    def postTweet(self, userId, tweetId):\n        pass\n\n    def getNewsFeed(self, userId):\n        pass\n\n    def follow(self, followerId, followeeId):\n        pass\n\n    def unfollow(self, followerId, followeeId):\n        pass\n\nclass Solution:\n    def twitter(self, operations, values):\n        pass"
    };
  })(),
  (() => {
    const visibleOps = [
      [["MedianFinder", "addNum", "addNum", "findMedian", "addNum", "findMedian"], [[], [1], [2], [], [3], []]],
      [["MedianFinder", "addNum", "findMedian", "addNum", "findMedian"], [[], [10], [], [-4], []]],
      [["MedianFinder", "addNum", "addNum", "addNum", "findMedian"], [[], [5], [5], [8], []]]
    ];
    const visible = visibleOps.map(([operations, values]) => caseFrom({ operations, values }, medianRun(operations, values)));
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const { operations, values } = medianSeed(seed);
      return caseFrom({ operations, values }, medianRun(operations, values));
    });
    return {
      id: 70,
      slug: "find-median-from-data-stream",
      title: "Find Median from Data Stream",
      difficulty: "Hard",
      tags: ["Two Pointers", "Design", "Sorting", "Heap", "Data Stream"],
      method: "medianFinder",
      visible: visibleCount,
      cases,
      statement: markdown("Find Median from Data Stream", "Design a structure that accepts numbers and returns the current median. The judge calls `medianFinder(operations, values)` and compares outputs from `findMedian`.", ["Input: addNum(1), addNum(2), findMedian(), addNum(3), findMedian()\nOutput: [1.5,2]", "Input: addNum(10), findMedian(), addNum(-4), findMedian()\nOutput: [10,3]", "Input: addNum(5), addNum(5), addNum(8), findMedian()\nOutput: [5]"], ["At least one number exists before each median query.", "Integer and `.5` medians are accepted as normal JSON numbers."]),
      editorial: "Keep a max-heap for the lower half and a min-heap for the upper half. Balance sizes after every insertion.",
      solution: "```python\nimport heapq\n\nclass MedianFinder:\n    def __init__(self):\n        self.low = []\n        self.high = []\n\n    def addNum(self, num):\n        heapq.heappush(self.low, -num)\n        heapq.heappush(self.high, -heapq.heappop(self.low))\n        if len(self.high) > len(self.low):\n            heapq.heappush(self.low, -heapq.heappop(self.high))\n\n    def findMedian(self):\n        if len(self.low) > len(self.high):\n            return -self.low[0]\n        return (-self.low[0] + self.high[0]) / 2\n\nclass Solution:\n    def medianFinder(self, operations, values):\n        obj = None\n        out = []\n        for op, args in zip(operations, values):\n            if op == 'MedianFinder':\n                obj = MedianFinder()\n            elif op == 'addNum':\n                obj.addNum(args[0])\n            elif op == 'findMedian':\n                out.append(obj.findMedian())\n        return out\n```",
      hints: ["The lower half needs quick access to its largest value.", "The upper half needs quick access to its smallest value."],
      starter: "class MedianFinder:\n    def __init__(self):\n        pass\n\n    def addNum(self, num):\n        pass\n\n    def findMedian(self):\n        pass\n\nclass Solution:\n    def medianFinder(self, operations, values):\n        pass"
    };
  })()
];

for (const problem of problems) {
  writeProblem(problem);
}

console.log(`Generated ${problems.length} trie/heap problem packs.`);
