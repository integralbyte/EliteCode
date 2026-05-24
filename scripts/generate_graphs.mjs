import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const problemsRoot = path.join(root, "problems");
const TARGET_CASES = 28;
const INF = 2147483647;

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

function markdown(title, body, examples, constraints) {
  return `# ${title}

${body.trim()}

## Examples

${examples.map((example, index) => `**Example ${index + 1}**\n\n\`\`\`text\n${example.trim()}\n\`\`\``).join("\n\n")}

## Constraints

${constraints.map((line) => `- ${line}`).join("\n")}`;
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

const deepCopy = (value) => JSON.parse(JSON.stringify(value));
const graphNode = (adjacency) => ({ __elite_type: "graph_node", adjacency });

function islandGrid(seed, rows = 2 + (seed % 4), cols = 3 + ((seed * 2) % 4)) {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ((seed + r * 3 + c * 5) % 4 === 0 ? "0" : "1"))
  );
}

function numIslands(grid) {
  const rows = grid.length, cols = grid[0].length;
  const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
  let count = 0;
  function dfs(r, c) {
    if (r < 0 || c < 0 || r === rows || c === cols || seen[r][c] || grid[r][c] !== "1") return;
    seen[r][c] = true;
    dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1);
  }
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (!seen[r][c] && grid[r][c] === "1") {
        count += 1;
        dfs(r, c);
      }
    }
  }
  return count;
}

function intGrid(seed, rows = 2 + (seed % 4), cols = 2 + ((seed * 3) % 4)) {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ((seed + r * 5 + c * 7) % 5 === 0 ? 0 : 1))
  );
}

function maxArea(grid) {
  const rows = grid.length, cols = grid[0].length;
  const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
  function dfs(r, c) {
    if (r < 0 || c < 0 || r === rows || c === cols || seen[r][c] || grid[r][c] === 0) return 0;
    seen[r][c] = true;
    return 1 + dfs(r + 1, c) + dfs(r - 1, c) + dfs(r, c + 1) + dfs(r, c - 1);
  }
  let best = 0;
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) best = Math.max(best, dfs(r, c));
  return best;
}

function connectedAdj(seed) {
  const n = 1 + (seed % 6);
  const sets = Array.from({ length: n }, () => new Set());
  for (let i = 1; i < n; i += 1) {
    sets[i - 1].add(i + 1);
    sets[i].add(i);
  }
  for (let i = 0; i < n; i += 1) {
    const j = (seed + i * 2) % n;
    if (i !== j) {
      sets[i].add(j + 1);
      sets[j].add(i + 1);
    }
  }
  return sets.map((set) => [...set].sort((a, b) => a - b));
}

function wallsGates(rooms) {
  const rows = rooms.length, cols = rooms[0].length;
  const queue = [];
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) if (rooms[r][c] === 0) queue.push([r, c]);
  for (let head = 0; head < queue.length; head += 1) {
    const [r, c] = queue[head];
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nc < 0 || nr === rows || nc === cols || rooms[nr][nc] !== INF) continue;
      rooms[nr][nc] = rooms[r][c] + 1;
      queue.push([nr, nc]);
    }
  }
  return rooms;
}

function roomsSeed(seed) {
  const rooms = Array.from({ length: 3 + (seed % 3) }, (_, r) =>
    Array.from({ length: 3 + ((seed + 1) % 3) }, (_, c) => ((seed + r + c) % 7 === 0 ? -1 : INF))
  );
  rooms[0][0] = 0;
  rooms[rooms.length - 1][rooms[0].length - 1] = seed % 2 === 0 ? 0 : rooms.at(-1).at(-1);
  return rooms;
}

function orangesRotting(grid) {
  const rows = grid.length, cols = grid[0].length;
  const queue = [];
  let fresh = 0;
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) {
    if (grid[r][c] === 2) queue.push([r, c, 0]);
    if (grid[r][c] === 1) fresh += 1;
  }
  let minutes = 0;
  for (let head = 0; head < queue.length; head += 1) {
    const [r, c, t] = queue[head];
    minutes = Math.max(minutes, t);
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nc < 0 || nr === rows || nc === cols || grid[nr][nc] !== 1) continue;
      grid[nr][nc] = 2;
      fresh -= 1;
      queue.push([nr, nc, t + 1]);
    }
  }
  return fresh === 0 ? minutes : -1;
}

function orangesSeed(seed) {
  const grid = intGrid(seed, 3, 4).map((row, r) => row.map((v, c) => (v === 0 ? 0 : ((seed + r + c) % 5 === 0 ? 2 : 1))));
  grid[0][0] = 2;
  return grid;
}

function pacificAtlantic(heights) {
  const rows = heights.length, cols = heights[0].length;
  const flow = (starts) => {
    const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
    const queue = [...starts];
    for (const [r, c] of queue) seen[r][c] = true;
    for (let head = 0; head < queue.length; head += 1) {
      const [r, c] = queue[head];
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr === rows || nc === cols || seen[nr][nc] || heights[nr][nc] < heights[r][c]) continue;
        seen[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
    return seen;
  };
  const pac = [], atl = [];
  for (let r = 0; r < rows; r += 1) { pac.push([r, 0]); atl.push([r, cols - 1]); }
  for (let c = 0; c < cols; c += 1) { pac.push([0, c]); atl.push([rows - 1, c]); }
  const a = flow(pac), b = flow(atl), out = [];
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) if (a[r][c] && b[r][c]) out.push([r, c]);
  return out.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
}

function heightsSeed(seed) {
  return Array.from({ length: 2 + (seed % 4) }, (_, r) =>
    Array.from({ length: 2 + ((seed * 2) % 4) }, (_, c) => 1 + ((seed * 11 + r * 5 + c * 7) % 9))
  );
}

function surrounded(board) {
  const rows = board.length, cols = board[0].length;
  function dfs(r, c) {
    if (r < 0 || c < 0 || r === rows || c === cols || board[r][c] !== "O") return;
    board[r][c] = "S";
    dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1);
  }
  for (let r = 0; r < rows; r += 1) { dfs(r, 0); dfs(r, cols - 1); }
  for (let c = 0; c < cols; c += 1) { dfs(0, c); dfs(rows - 1, c); }
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) board[r][c] = board[r][c] === "S" ? "O" : "X";
  return board;
}

function boardSeed(seed) {
  return Array.from({ length: 3 + (seed % 3) }, (_, r) =>
    Array.from({ length: 3 + ((seed + 2) % 3) }, (_, c) => ((seed + r * 3 + c * 5) % 4 === 0 ? "O" : "X"))
  );
}

function topoOrder(numCourses, prerequisites) {
  const indeg = Array(numCourses).fill(0);
  const graph = Array.from({ length: numCourses }, () => []);
  for (const [course, pre] of prerequisites) { graph[pre].push(course); indeg[course] += 1; }
  const queue = [];
  for (let i = 0; i < numCourses; i += 1) if (indeg[i] === 0) queue.push(i);
  const out = [];
  for (let head = 0; head < queue.length; head += 1) {
    const node = queue[head];
    out.push(node);
    for (const next of graph[node]) if (--indeg[next] === 0) queue.push(next);
  }
  return out.length === numCourses ? out : [];
}

function courseSeed(seed) {
  const n = 2 + (seed % 7);
  const prerequisites = [];
  for (let i = 1; i < n; i += 1) if ((seed + i) % 2 === 0) prerequisites.push([i, (i - 1) % n]);
  if (seed % 5 === 0) prerequisites.push([0, n - 1], [n - 1, 0]);
  return { n, prerequisites };
}

function dsu(n) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => parent[x] === x ? x : (parent[x] = find(parent[x]));
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra === rb) return false;
    parent[ra] = rb;
    return true;
  };
  return { union, find };
}

function validTree(n, edges) {
  if (edges.length !== n - 1) return false;
  const uf = dsu(n);
  return edges.every(([a, b]) => uf.union(a, b));
}

function countComponents(n, edges) {
  const uf = dsu(n);
  let count = n;
  for (const [a, b] of edges) if (uf.union(a, b)) count -= 1;
  return count;
}

function redundant(edges) {
  const uf = dsu(edges.length + 1);
  for (const [a, b] of edges) if (!uf.union(a, b)) return [a, b];
  return [];
}

function ladderLength(beginWord, endWord, wordList) {
  const words = new Set(wordList);
  if (!words.has(endWord)) return 0;
  const queue = [[beginWord, 1]];
  const seen = new Set([beginWord]);
  for (let head = 0; head < queue.length; head += 1) {
    const [word, depth] = queue[head];
    if (word === endWord) return depth;
    for (let i = 0; i < word.length; i += 1) {
      for (const ch of "abcdefghijklmnopqrstuvwxyz") {
        const next = word.slice(0, i) + ch + word.slice(i + 1);
        if (words.has(next) && !seen.has(next)) {
          seen.add(next);
          queue.push([next, depth + 1]);
        }
      }
    }
  }
  return 0;
}

function findItinerary(tickets) {
  const graph = new Map();
  for (const [src, dst] of tickets) {
    if (!graph.has(src)) graph.set(src, []);
    graph.get(src).push(dst);
  }
  for (const list of graph.values()) list.sort().reverse();
  const route = [];
  function visit(airport) {
    const list = graph.get(airport) ?? [];
    while (list.length) visit(list.pop());
    route.push(airport);
  }
  visit("JFK");
  return route.reverse();
}

function minCostPoints(points) {
  const n = points.length, used = Array(n).fill(false), best = Array(n).fill(Infinity);
  best[0] = 0;
  let total = 0;
  for (let step = 0; step < n; step += 1) {
    let pick = -1;
    for (let i = 0; i < n; i += 1) if (!used[i] && (pick === -1 || best[i] < best[pick])) pick = i;
    used[pick] = true;
    total += best[pick];
    for (let i = 0; i < n; i += 1) {
      const dist = Math.abs(points[pick][0] - points[i][0]) + Math.abs(points[pick][1] - points[i][1]);
      if (!used[i] && dist < best[i]) best[i] = dist;
    }
  }
  return total;
}

function pointsSeed(seed) {
  return Array.from({ length: 2 + (seed % 7) }, (_, i) => [((seed * 17 + i * 5) % 31) - 15, ((seed * 13 + i * 7) % 29) - 14]);
}

function networkDelay(times, n, k) {
  const dist = Array(n + 1).fill(Infinity);
  dist[k] = 0;
  for (let i = 1; i < n; i += 1) {
    for (const [u, v, w] of times) dist[v] = Math.min(dist[v], dist[u] + w);
  }
  const max = Math.max(...dist.slice(1));
  return Number.isFinite(max) ? max : -1;
}

function swim(grid) {
  const n = grid.length;
  const seen = Array.from({ length: n }, () => Array(n).fill(false));
  const heap = [[grid[0][0], 0, 0]];
  while (heap.length) {
    heap.sort((a, b) => a[0] - b[0]);
    const [time, r, c] = heap.shift();
    if (seen[r][c]) continue;
    seen[r][c] = true;
    if (r === n - 1 && c === n - 1) return time;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nc >= 0 && nr < n && nc < n && !seen[nr][nc]) heap.push([Math.max(time, grid[nr][nc]), nr, nc]);
    }
  }
  return 0;
}

function swimGrid(seed) {
  const n = 2 + (seed % 4);
  const values = Array.from({ length: n * n }, (_, i) => i);
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = (seed * 7 + i * 3) % (i + 1);
    [values[i], values[j]] = [values[j], values[i]];
  }
  return Array.from({ length: n }, (_, r) => values.slice(r * n, r * n + n));
}

function alienOrder(words) {
  const chars = new Set(words.join(""));
  const graph = new Map([...chars].map((ch) => [ch, new Set()]));
  const indeg = new Map([...chars].map((ch) => [ch, 0]));
  for (let i = 0; i < words.length - 1; i += 1) {
    const a = words[i], b = words[i + 1];
    if (a.length > b.length && a.startsWith(b)) return "";
    for (let j = 0; j < Math.min(a.length, b.length); j += 1) {
      if (a[j] !== b[j]) {
        if (!graph.get(a[j]).has(b[j])) {
          graph.get(a[j]).add(b[j]);
          indeg.set(b[j], indeg.get(b[j]) + 1);
        }
        break;
      }
    }
  }
  const queue = [...chars].filter((ch) => indeg.get(ch) === 0).sort();
  let out = "";
  while (queue.length) {
    const ch = queue.shift();
    out += ch;
    for (const next of [...graph.get(ch)].sort()) {
      indeg.set(next, indeg.get(next) - 1);
      if (indeg.get(next) === 0) {
        queue.push(next);
        queue.sort();
      }
    }
  }
  return out.length === chars.size ? out : "";
}

function cheapest(n, flights, src, dst, k) {
  let prices = Array(n).fill(Infinity);
  prices[src] = 0;
  for (let i = 0; i <= k; i += 1) {
    const next = [...prices];
    for (const [u, v, w] of flights) if (prices[u] + w < next[v]) next[v] = prices[u] + w;
    prices = next;
  }
  return Number.isFinite(prices[dst]) ? prices[dst] : -1;
}

const unorderedCoordsChecker = `
from __future__ import annotations
from typing import Any

def check(input_data: dict[str, Any], expected: list[list[int]], actual: Any) -> dict[str, Any]:
    try:
        return {"passed": sorted(map(tuple, actual)) == sorted(map(tuple, expected)), "message": ""}
    except TypeError:
        return {"passed": False, "message": "Expected a list of coordinate pairs."}
`;

const topoChecker = `
from __future__ import annotations
from typing import Any

def check(input_data: dict[str, Any], expected: list[int], actual: Any) -> dict[str, Any]:
    n = input_data["numCourses"]
    prereqs = input_data["prerequisites"]
    if expected == []:
        return {"passed": actual == [], "message": ""}
    if not isinstance(actual, list) or len(actual) != n or set(actual) != set(range(n)):
        return {"passed": False, "message": "Expected a permutation of all courses."}
    pos = {course: index for index, course in enumerate(actual)}
    ok = all(pos[pre] < pos[course] for course, pre in prereqs)
    return {"passed": ok, "message": ""}
`;

const alienChecker = `
from __future__ import annotations
from typing import Any

def check(input_data: dict[str, Any], expected: str, actual: Any) -> dict[str, Any]:
    words = input_data["words"]
    chars = set("".join(words))
    if expected == "":
        return {"passed": actual == "", "message": ""}
    if not isinstance(actual, str) or set(actual) != chars or len(actual) != len(chars):
        return {"passed": False, "message": "Expected an ordering containing each alien character once."}
    pos = {ch: i for i, ch in enumerate(actual)}
    for a, b in zip(words, words[1:]):
        if len(a) > len(b) and a.startswith(b):
            return {"passed": actual == "", "message": ""}
        for left, right in zip(a, b):
            if left != right:
                if pos[left] > pos[right]:
                    return {"passed": False, "message": "Ordering violates adjacent word precedence."}
                break
    return {"passed": True, "message": ""}
`;

function makeProblem(id, slug, title, difficulty, tags, method, visible, makeCase, body, examples, solution, starter, checker = null, hints = ["Model the state explicitly.", "Prefer linear or near-linear graph traversal when possible."]) {
  const filled = fillCases(visible, makeCase);
  return {
    id, slug, title, difficulty, tags, method, visible: filled.visible, cases: filled.cases, checker,
    statement: markdown(title, body, examples, ["Inputs are sized for local offline execution.", "Return values follow the method description."]),
    editorial: "Use the graph structure directly: traverse reachable states, maintain visited or distance state, and update the answer when each node or cell is settled.",
    solution,
    hints,
    starter
  };
}

const problems = [];

problems.push(makeProblem(80, "number-of-islands", "Number of Islands", "Medium", ["Array", "Depth-First Search", "Breadth-First Search", "Union Find", "Matrix"], "numIslands", [
  caseFrom({ grid: [["1", "1", "0"], ["0", "1", "0"], ["1", "0", "1"]] }, 3),
  caseFrom({ grid: [["1", "1"], ["1", "1"]] }, 1),
  caseFrom({ grid: [["0", "0"], ["0", "0"]] }, 0)
], (seed) => { const grid = islandGrid(seed); return caseFrom({ grid }, numIslands(grid)); }, "Count groups of land cells connected horizontally or vertically in a grid of `1` and `0` characters.", ["Input: grid = [[1,1,0],[0,1,0],[1,0,1]]\nOutput: 3", "Input: grid = [[1,1],[1,1]]\nOutput: 1", "Input: grid = [[0,0],[0,0]]\nOutput: 0"], "```python\nclass Solution:\n    def numIslands(self, grid):\n        rows, cols = len(grid), len(grid[0])\n        def dfs(r, c):\n            if r < 0 or c < 0 or r == rows or c == cols or grid[r][c] != '1':\n                return\n            grid[r][c] = '0'\n            dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1)\n        count = 0\n        for r in range(rows):\n            for c in range(cols):\n                if grid[r][c] == '1':\n                    count += 1\n                    dfs(r, c)\n        return count\n```", "class Solution:\n    def numIslands(self, grid):\n        pass"));

problems.push(makeProblem(81, "max-area-of-island", "Max Area of Island", "Medium", ["Array", "Depth-First Search", "Breadth-First Search", "Union Find", "Matrix"], "maxAreaOfIsland", [
  caseFrom({ grid: [[1, 1, 0], [0, 1, 1], [1, 0, 0]] }, 4),
  caseFrom({ grid: [[0, 0], [0, 0]] }, 0),
  caseFrom({ grid: [[1]] }, 1)
], (seed) => { const grid = intGrid(seed); return caseFrom({ grid }, maxArea(grid)); }, "Return the largest size of a connected component of `1` cells in a binary grid.", ["Input: grid = [[1,1,0],[0,1,1],[1,0,0]]\nOutput: 4", "Input: grid = [[0,0],[0,0]]\nOutput: 0", "Input: grid = [[1]]\nOutput: 1"], "```python\nclass Solution:\n    def maxAreaOfIsland(self, grid):\n        rows, cols = len(grid), len(grid[0])\n        def dfs(r, c):\n            if r < 0 or c < 0 or r == rows or c == cols or grid[r][c] == 0:\n                return 0\n            grid[r][c] = 0\n            return 1 + dfs(r + 1, c) + dfs(r - 1, c) + dfs(r, c + 1) + dfs(r, c - 1)\n        return max(dfs(r, c) for r in range(rows) for c in range(cols))\n```", "class Solution:\n    def maxAreaOfIsland(self, grid):\n        pass"));

problems.push(makeProblem(82, "clone-graph", "Clone Graph", "Medium", ["Hash Table", "Depth-First Search", "Breadth-First Search", "Graph"], "cloneGraph", [
  caseFrom({ node: graphNode([[2, 4], [1, 3], [2, 4], [1, 3]]) }, [[2, 4], [1, 3], [2, 4], [1, 3]]),
  caseFrom({ node: graphNode([[]]) }, [[]]),
  caseFrom({ node: graphNode([]) }, [])
], (seed) => { const adjacency = connectedAdj(seed); return caseFrom({ node: graphNode(adjacency) }, adjacency); }, "Return a deep copy of a connected undirected graph. Nodes are numbered from `1`, and output is displayed as an adjacency list.", ["Input: adjacency = [[2,4],[1,3],[2,4],[1,3]]\nOutput: [[2,4],[1,3],[2,4],[1,3]]", "Input: adjacency = [[]]\nOutput: [[]]", "Input: adjacency = []\nOutput: []"], "```python\nclass Solution:\n    def cloneGraph(self, node):\n        clones = {}\n        def clone(current):\n            if not current:\n                return None\n            if current in clones:\n                return clones[current]\n            copy = Node(current.val, [])\n            clones[current] = copy\n            copy.neighbors = [clone(neighbor) for neighbor in current.neighbors]\n            return copy\n        return clone(node)\n```", "class Solution:\n    def cloneGraph(self, node):\n        pass"));

problems.push(makeProblem(83, "walls-and-gates", "Walls and Gates", "Medium", ["Array", "Breadth-First Search", "Matrix"], "wallsAndGates", [
  (() => { const rooms = [[INF, -1, 0, INF], [INF, INF, INF, -1], [INF, -1, INF, -1], [0, -1, INF, INF]]; return caseFrom({ rooms }, wallsGates(deepCopy(rooms))); })(),
  (() => { const rooms = [[0, INF], [INF, INF]]; return caseFrom({ rooms }, wallsGates(deepCopy(rooms))); })(),
  caseFrom({ rooms: [[-1]] }, [[-1]])
], (seed) => { const rooms = roomsSeed(seed); return caseFrom({ rooms }, wallsGates(deepCopy(rooms))); }, "Fill each empty room with its distance to the nearest gate. Walls stay `-1`, gates are `0`, and unreachable empty rooms stay `2147483647`.", ["Input: rooms = [[INF,-1,0,INF],[INF,INF,INF,-1],[INF,-1,INF,-1],[0,-1,INF,INF]]\nOutput: [[3,-1,0,1],[2,2,1,-1],[1,-1,2,-1],[0,-1,3,4]]", "Input: rooms = [[0,INF],[INF,INF]]\nOutput: [[0,1],[1,2]]", "Input: rooms = [[-1]]\nOutput: [[-1]]"], "```python\nfrom collections import deque\n\nclass Solution:\n    def wallsAndGates(self, rooms):\n        rows, cols = len(rooms), len(rooms[0])\n        queue = deque((r, c) for r in range(rows) for c in range(cols) if rooms[r][c] == 0)\n        while queue:\n            r, c = queue.popleft()\n            for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):\n                nr, nc = r + dr, c + dc\n                if 0 <= nr < rows and 0 <= nc < cols and rooms[nr][nc] == 2147483647:\n                    rooms[nr][nc] = rooms[r][c] + 1\n                    queue.append((nr, nc))\n```", "class Solution:\n    def wallsAndGates(self, rooms):\n        pass"));

problems.push(makeProblem(84, "rotting-oranges", "Rotting Oranges", "Medium", ["Array", "Breadth-First Search", "Matrix"], "orangesRotting", [
  caseFrom({ grid: [[2, 1, 1], [1, 1, 0], [0, 1, 1]] }, 4),
  caseFrom({ grid: [[2, 1, 1], [0, 1, 1], [1, 0, 1]] }, -1),
  caseFrom({ grid: [[0, 2]] }, 0)
], (seed) => { const grid = orangesSeed(seed); return caseFrom({ grid }, orangesRotting(deepCopy(grid))); }, "Each minute, rotten oranges rot adjacent fresh oranges. Return the minutes needed to rot all fresh oranges, or `-1` if impossible.", ["Input: grid = [[2,1,1],[1,1,0],[0,1,1]]\nOutput: 4", "Input: grid = [[2,1,1],[0,1,1],[1,0,1]]\nOutput: -1", "Input: grid = [[0,2]]\nOutput: 0"], "```python\nfrom collections import deque\n\nclass Solution:\n    def orangesRotting(self, grid):\n        rows, cols = len(grid), len(grid[0])\n        queue = deque()\n        fresh = 0\n        for r in range(rows):\n            for c in range(cols):\n                if grid[r][c] == 2:\n                    queue.append((r, c, 0))\n                elif grid[r][c] == 1:\n                    fresh += 1\n        minutes = 0\n        while queue:\n            r, c, minutes = queue.popleft()\n            for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):\n                nr, nc = r + dr, c + dc\n                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:\n                    grid[nr][nc] = 2\n                    fresh -= 1\n                    queue.append((nr, nc, minutes + 1))\n        return minutes if fresh == 0 else -1\n```", "class Solution:\n    def orangesRotting(self, grid):\n        pass"));

problems.push(makeProblem(85, "pacific-atlantic-water-flow", "Pacific Atlantic Water Flow", "Medium", ["Array", "Depth-First Search", "Breadth-First Search", "Matrix"], "pacificAtlantic", [
  (() => { const heights = [[1, 2, 2], [3, 2, 3], [2, 4, 5]]; return caseFrom({ heights }, pacificAtlantic(heights)); })(),
  (() => { const heights = [[7]]; return caseFrom({ heights }, pacificAtlantic(heights)); })(),
  (() => { const heights = [[1, 2], [4, 3]]; return caseFrom({ heights }, pacificAtlantic(heights)); })()
], (seed) => { const heights = heightsSeed(seed); return caseFrom({ heights }, pacificAtlantic(heights)); }, "Return all cells from which water can flow to both the top/left ocean and the bottom/right ocean, moving only from higher or equal height to lower or equal height.", ["Input: heights = [[1,2,2],[3,2,3],[2,4,5]]\nOutput: [[0,2],[1,0],[1,2],[2,0],[2,1],[2,2]]", "Input: heights = [[7]]\nOutput: [[0,0]]", "Input: heights = [[1,2],[4,3]]\nOutput: [[0,1],[1,0],[1,1]]"], "```python\nclass Solution:\n    def pacificAtlantic(self, heights):\n        rows, cols = len(heights), len(heights[0])\n        def dfs(starts):\n            seen = set(starts)\n            stack = list(starts)\n            while stack:\n                r, c = stack.pop()\n                for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):\n                    nr, nc = r + dr, c + dc\n                    if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in seen and heights[nr][nc] >= heights[r][c]:\n                        seen.add((nr, nc)); stack.append((nr, nc))\n            return seen\n        pac = dfs([(r,0) for r in range(rows)] + [(0,c) for c in range(cols)])\n        atl = dfs([(r,cols-1) for r in range(rows)] + [(rows-1,c) for c in range(cols)])\n        return [[r, c] for r, c in sorted(pac & atl)]\n```", "class Solution:\n    def pacificAtlantic(self, heights):\n        pass", unorderedCoordsChecker));

problems.push(makeProblem(86, "surrounded-regions", "Surrounded Regions", "Medium", ["Array", "Depth-First Search", "Breadth-First Search", "Union Find", "Matrix"], "solve", [
  (() => { const board = [["X", "X", "X", "X"], ["X", "O", "O", "X"], ["X", "X", "O", "X"], ["X", "O", "X", "X"]]; return caseFrom({ board }, surrounded(deepCopy(board))); })(),
  (() => { const board = [["O", "O"], ["O", "O"]]; return caseFrom({ board }, surrounded(deepCopy(board))); })(),
  caseFrom({ board: [["X"]] }, [["X"]])
], (seed) => { const board = boardSeed(seed); return caseFrom({ board }, surrounded(deepCopy(board))); }, "Capture every `O` region fully surrounded by `X` by changing those `O` cells to `X`. Border-connected `O` cells remain.", ["Input: board = [[X,X,X,X],[X,O,O,X],[X,X,O,X],[X,O,X,X]]\nOutput: [[X,X,X,X],[X,X,X,X],[X,X,X,X],[X,O,X,X]]", "Input: board = [[O,O],[O,O]]\nOutput: [[O,O],[O,O]]", "Input: board = [[X]]\nOutput: [[X]]"], "```python\nclass Solution:\n    def solve(self, board):\n        rows, cols = len(board), len(board[0])\n        def dfs(r, c):\n            if r < 0 or c < 0 or r == rows or c == cols or board[r][c] != 'O':\n                return\n            board[r][c] = 'S'\n            dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1)\n        for r in range(rows):\n            dfs(r, 0); dfs(r, cols - 1)\n        for c in range(cols):\n            dfs(0, c); dfs(rows - 1, c)\n        for r in range(rows):\n            for c in range(cols):\n                board[r][c] = 'O' if board[r][c] == 'S' else 'X'\n```", "class Solution:\n    def solve(self, board):\n        pass"));

problems.push(makeProblem(87, "course-schedule", "Course Schedule", "Medium", ["Depth-First Search", "Breadth-First Search", "Graph", "Topological Sort"], "canFinish", [
  caseFrom({ numCourses: 2, prerequisites: [[1, 0]] }, true),
  caseFrom({ numCourses: 2, prerequisites: [[1, 0], [0, 1]] }, false),
  caseFrom({ numCourses: 4, prerequisites: [[1, 0], [2, 1], [3, 2]] }, true)
], (seed) => { const { n, prerequisites } = courseSeed(seed); return caseFrom({ numCourses: n, prerequisites }, topoOrder(n, prerequisites).length === n); }, "Return whether all courses can be completed given prerequisite pairs `[course, prerequisite]`.", ["Input: numCourses = 2, prerequisites = [[1,0]]\nOutput: true", "Input: numCourses = 2, prerequisites = [[1,0],[0,1]]\nOutput: false", "Input: numCourses = 4, prerequisites = [[1,0],[2,1],[3,2]]\nOutput: true"], "```python\nfrom collections import deque\n\nclass Solution:\n    def canFinish(self, numCourses, prerequisites):\n        graph = [[] for _ in range(numCourses)]\n        indeg = [0] * numCourses\n        for course, pre in prerequisites:\n            graph[pre].append(course); indeg[course] += 1\n        queue = deque(i for i, value in enumerate(indeg) if value == 0)\n        done = 0\n        while queue:\n            node = queue.popleft(); done += 1\n            for nxt in graph[node]:\n                indeg[nxt] -= 1\n                if indeg[nxt] == 0: queue.append(nxt)\n        return done == numCourses\n```", "class Solution:\n    def canFinish(self, numCourses, prerequisites):\n        pass"));

problems.push(makeProblem(88, "course-schedule-ii", "Course Schedule II", "Medium", ["Depth-First Search", "Breadth-First Search", "Graph", "Topological Sort"], "findOrder", [
  caseFrom({ numCourses: 2, prerequisites: [[1, 0]] }, [0, 1]),
  caseFrom({ numCourses: 2, prerequisites: [[1, 0], [0, 1]] }, []),
  caseFrom({ numCourses: 4, prerequisites: [[1, 0], [2, 0], [3, 1], [3, 2]] }, [0, 1, 2, 3])
], (seed) => { const { n, prerequisites } = courseSeed(seed); return caseFrom({ numCourses: n, prerequisites }, topoOrder(n, prerequisites)); }, "Return one valid order to take all courses, or an empty list when no order exists.", ["Input: numCourses = 2, prerequisites = [[1,0]]\nOutput: [0,1]", "Input: numCourses = 2, prerequisites = [[1,0],[0,1]]\nOutput: []", "Input: numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]\nOutput: [0,1,2,3]"], "```python\nfrom collections import deque\n\nclass Solution:\n    def findOrder(self, numCourses, prerequisites):\n        graph = [[] for _ in range(numCourses)]\n        indeg = [0] * numCourses\n        for course, pre in prerequisites:\n            graph[pre].append(course); indeg[course] += 1\n        queue = deque(i for i, value in enumerate(indeg) if value == 0)\n        order = []\n        while queue:\n            node = queue.popleft(); order.append(node)\n            for nxt in graph[node]:\n                indeg[nxt] -= 1\n                if indeg[nxt] == 0: queue.append(nxt)\n        return order if len(order) == numCourses else []\n```", "class Solution:\n    def findOrder(self, numCourses, prerequisites):\n        pass", topoChecker));

problems.push(makeProblem(89, "graph-valid-tree", "Graph Valid Tree", "Medium", ["Depth-First Search", "Breadth-First Search", "Union Find", "Graph"], "validTree", [
  caseFrom({ n: 5, edges: [[0, 1], [0, 2], [0, 3], [1, 4]] }, true),
  caseFrom({ n: 5, edges: [[0, 1], [1, 2], [2, 3], [1, 3], [1, 4]] }, false),
  caseFrom({ n: 3, edges: [[0, 1]] }, false)
], (seed) => { const n = 2 + (seed % 8); const edges = Array.from({ length: n - 1 }, (_, i) => [i, i + 1]); if (seed % 3 === 0) edges.push([0, n - 1]); return caseFrom({ n, edges }, validTree(n, edges)); }, "Return whether an undirected graph with `n` nodes is connected and acyclic.", ["Input: n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]\nOutput: true", "Input: n = 5, edges = [[0,1],[1,2],[2,3],[1,3],[1,4]]\nOutput: false", "Input: n = 3, edges = [[0,1]]\nOutput: false"], "```python\nclass Solution:\n    def validTree(self, n, edges):\n        if len(edges) != n - 1:\n            return False\n        parent = list(range(n))\n        def find(x):\n            while parent[x] != x:\n                parent[x] = parent[parent[x]]; x = parent[x]\n            return x\n        for a, b in edges:\n            ra, rb = find(a), find(b)\n            if ra == rb: return False\n            parent[ra] = rb\n        return True\n```", "class Solution:\n    def validTree(self, n, edges):\n        pass"));

problems.push(makeProblem(90, "number-of-connected-components-in-an-undirected-graph", "Number of Connected Components in an Undirected Graph", "Medium", ["Depth-First Search", "Breadth-First Search", "Union Find", "Graph"], "countComponents", [
  caseFrom({ n: 5, edges: [[0, 1], [1, 2], [3, 4]] }, 2),
  caseFrom({ n: 4, edges: [] }, 4),
  caseFrom({ n: 3, edges: [[0, 1], [1, 2]] }, 1)
], (seed) => { const n = 2 + (seed % 8); const edges = []; for (let i = 1; i < n; i += 1) if ((seed + i) % 3 !== 0) edges.push([i - 1, i]); return caseFrom({ n, edges }, countComponents(n, edges)); }, "Return how many connected components exist in an undirected graph.", ["Input: n = 5, edges = [[0,1],[1,2],[3,4]]\nOutput: 2", "Input: n = 4, edges = []\nOutput: 4", "Input: n = 3, edges = [[0,1],[1,2]]\nOutput: 1"], "```python\nclass Solution:\n    def countComponents(self, n, edges):\n        parent = list(range(n))\n        def find(x):\n            while parent[x] != x:\n                parent[x] = parent[parent[x]]; x = parent[x]\n            return x\n        count = n\n        for a, b in edges:\n            ra, rb = find(a), find(b)\n            if ra != rb:\n                parent[ra] = rb; count -= 1\n        return count\n```", "class Solution:\n    def countComponents(self, n, edges):\n        pass"));

problems.push(makeProblem(91, "redundant-connection", "Redundant Connection", "Medium", ["Depth-First Search", "Breadth-First Search", "Union Find", "Graph"], "findRedundantConnection", [
  caseFrom({ edges: [[1, 2], [1, 3], [2, 3]] }, [2, 3]),
  caseFrom({ edges: [[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]] }, [1, 4]),
  caseFrom({ edges: [[1, 2], [2, 3], [1, 3]] }, [1, 3])
], (seed) => { const n = 3 + (seed % 7); const edges = Array.from({ length: n - 1 }, (_, i) => [i + 1, i + 2]); edges.push([1, n]); return caseFrom({ edges }, redundant(edges)); }, "A tree had one extra undirected edge added. Return the last edge that creates a cycle.", ["Input: edges = [[1,2],[1,3],[2,3]]\nOutput: [2,3]", "Input: edges = [[1,2],[2,3],[3,4],[1,4],[1,5]]\nOutput: [1,4]", "Input: edges = [[1,2],[2,3],[1,3]]\nOutput: [1,3]"], "```python\nclass Solution:\n    def findRedundantConnection(self, edges):\n        parent = list(range(len(edges) + 1))\n        def find(x):\n            while parent[x] != x:\n                parent[x] = parent[parent[x]]; x = parent[x]\n            return x\n        for a, b in edges:\n            ra, rb = find(a), find(b)\n            if ra == rb: return [a, b]\n            parent[ra] = rb\n```", "class Solution:\n    def findRedundantConnection(self, edges):\n        pass"));

problems.push(makeProblem(92, "word-ladder", "Word Ladder", "Hard", ["Hash Table", "String", "Breadth-First Search"], "ladderLength", [
  caseFrom({ beginWord: "cold", endWord: "warm", wordList: ["cord", "card", "ward", "warm", "worm", "cold"] }, 5),
  caseFrom({ beginWord: "hit", endWord: "cog", wordList: ["hot", "dot", "dog", "lot", "log"] }, 0),
  caseFrom({ beginWord: "a", endWord: "c", wordList: ["a", "b", "c"] }, 2)
], (seed) => { const words = ["cold", "cord", "card", "ward", "warm", "worm", "word"]; const list = seed % 4 === 0 ? words.slice(1, -1) : words.slice(1); return caseFrom({ beginWord: "cold", endWord: "warm", wordList: list }, ladderLength("cold", "warm", list)); }, "Return the number of words in the shortest transformation from `beginWord` to `endWord`, changing one letter at a time and using only words from the list.", ["Input: beginWord = cold, endWord = warm, wordList = [cord,card,ward,warm,worm,cold]\nOutput: 5", "Input: beginWord = hit, endWord = cog, wordList = [hot,dot,dog,lot,log]\nOutput: 0", "Input: beginWord = a, endWord = c, wordList = [a,b,c]\nOutput: 2"], "```python\nfrom collections import deque\n\nclass Solution:\n    def ladderLength(self, beginWord, endWord, wordList):\n        words = set(wordList)\n        if endWord not in words: return 0\n        queue = deque([(beginWord, 1)])\n        seen = {beginWord}\n        while queue:\n            word, depth = queue.popleft()\n            if word == endWord: return depth\n            for i in range(len(word)):\n                for code in range(ord('a'), ord('z') + 1):\n                    nxt = word[:i] + chr(code) + word[i + 1:]\n                    if nxt in words and nxt not in seen:\n                        seen.add(nxt); queue.append((nxt, depth + 1))\n        return 0\n```", "class Solution:\n    def ladderLength(self, beginWord, endWord, wordList):\n        pass"));

problems.push(makeProblem(93, "reconstruct-itinerary", "Reconstruct Itinerary", "Hard", ["Depth-First Search", "Graph", "Eulerian Circuit"], "findItinerary", [
  caseFrom({ tickets: [["JFK", "SFO"], ["JFK", "ATL"], ["ATL", "JFK"], ["SFO", "ATL"]] }, ["JFK", "ATL", "JFK", "SFO", "ATL"]),
  caseFrom({ tickets: [["JFK", "A"], ["A", "B"], ["B", "JFK"]] }, ["JFK", "A", "B", "JFK"]),
  caseFrom({ tickets: [["JFK", "KUL"], ["JFK", "NRT"], ["NRT", "JFK"]] }, ["JFK", "NRT", "JFK", "KUL"])
], (seed) => { const tickets = seed % 2 ? [["JFK","A"],["A","C"],["C","JFK"],["JFK","B"],["B","A"]] : [["JFK","B"],["JFK","A"],["A","JFK"]]; return caseFrom({ tickets }, findItinerary(tickets)); }, "Use all airline tickets exactly once starting from `JFK`, returning the lexicographically smallest valid route.", ["Input: tickets = [[JFK,SFO],[JFK,ATL],[ATL,JFK],[SFO,ATL]]\nOutput: [JFK,ATL,JFK,SFO,ATL]", "Input: tickets = [[JFK,A],[A,B],[B,JFK]]\nOutput: [JFK,A,B,JFK]", "Input: tickets = [[JFK,KUL],[JFK,NRT],[NRT,JFK]]\nOutput: [JFK,NRT,JFK,KUL]"], "```python\nfrom collections import defaultdict\n\nclass Solution:\n    def findItinerary(self, tickets):\n        graph = defaultdict(list)\n        for src, dst in sorted(tickets, reverse=True):\n            graph[src].append(dst)\n        route = []\n        def visit(airport):\n            while graph[airport]:\n                visit(graph[airport].pop())\n            route.append(airport)\n        visit('JFK')\n        return route[::-1]\n```", "class Solution:\n    def findItinerary(self, tickets):\n        pass"));

problems.push(makeProblem(94, "min-cost-to-connect-all-points", "Min Cost to Connect All Points", "Medium", ["Array", "Union Find", "Graph", "Minimum Spanning Tree"], "minCostConnectPoints", [
  caseFrom({ points: [[0, 0], [2, 2], [3, 10], [5, 2], [7, 0]] }, 20),
  caseFrom({ points: [[3, 12], [-2, 5], [-4, 1]] }, 18),
  caseFrom({ points: [[0, 0]] }, 0)
], (seed) => { const points = pointsSeed(seed); return caseFrom({ points }, minCostPoints(points)); }, "Connect all points with minimum total Manhattan distance.", ["Input: points = [[0,0],[2,2],[3,10],[5,2],[7,0]]\nOutput: 20", "Input: points = [[3,12],[-2,5],[-4,1]]\nOutput: 18", "Input: points = [[0,0]]\nOutput: 0"], "```python\nclass Solution:\n    def minCostConnectPoints(self, points):\n        n = len(points)\n        used = [False] * n\n        best = [float('inf')] * n\n        best[0] = 0\n        total = 0\n        for _ in range(n):\n            pick = min((i for i in range(n) if not used[i]), key=lambda i: best[i])\n            used[pick] = True; total += best[pick]\n            x, y = points[pick]\n            for i, (a, b) in enumerate(points):\n                if not used[i]:\n                    best[i] = min(best[i], abs(x - a) + abs(y - b))\n        return total\n```", "class Solution:\n    def minCostConnectPoints(self, points):\n        pass"));

problems.push(makeProblem(95, "network-delay-time", "Network Delay Time", "Medium", ["Depth-First Search", "Breadth-First Search", "Graph", "Heap", "Shortest Path"], "networkDelayTime", [
  caseFrom({ times: [[2, 1, 1], [2, 3, 1], [3, 4, 1]], n: 4, k: 2 }, 2),
  caseFrom({ times: [[1, 2, 1]], n: 2, k: 1 }, 1),
  caseFrom({ times: [[1, 2, 1]], n: 2, k: 2 }, -1)
], (seed) => { const n = 2 + (seed % 6); const times = Array.from({ length: n - 1 }, (_, i) => [i + 1, i + 2, 1 + ((seed + i) % 9)]); if (seed % 3) times.push([1, n, 2 + seed % 5]); return caseFrom({ times, n, k: 1 }, networkDelay(times, n, 1)); }, "Return how long it takes for a signal from `k` to reach every node, or `-1` if some node is unreachable.", ["Input: times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2\nOutput: 2", "Input: times = [[1,2,1]], n = 2, k = 1\nOutput: 1", "Input: times = [[1,2,1]], n = 2, k = 2\nOutput: -1"], "```python\nimport heapq\nfrom collections import defaultdict\n\nclass Solution:\n    def networkDelayTime(self, times, n, k):\n        graph = defaultdict(list)\n        for u, v, w in times: graph[u].append((v, w))\n        dist = {}\n        heap = [(0, k)]\n        while heap:\n            d, node = heapq.heappop(heap)\n            if node in dist: continue\n            dist[node] = d\n            for nxt, w in graph[node]:\n                if nxt not in dist: heapq.heappush(heap, (d + w, nxt))\n        return max(dist.values()) if len(dist) == n else -1\n```", "class Solution:\n    def networkDelayTime(self, times, n, k):\n        pass"));

problems.push(makeProblem(96, "swim-in-rising-water", "Swim in Rising Water", "Hard", ["Array", "Binary Search", "Depth-First Search", "Breadth-First Search", "Union Find", "Heap", "Matrix"], "swimInWater", [
  caseFrom({ grid: [[0, 2], [1, 3]] }, 3),
  caseFrom({ grid: [[0, 1, 2], [5, 4, 3], [6, 7, 8]] }, 8),
  caseFrom({ grid: [[7]] }, 7)
], (seed) => { const grid = swimGrid(seed); return caseFrom({ grid }, swim(grid)); }, "Return the earliest time when a path exists from the top-left to bottom-right cell in a grid whose values are water levels.", ["Input: grid = [[0,2],[1,3]]\nOutput: 3", "Input: grid = [[0,1,2],[5,4,3],[6,7,8]]\nOutput: 8", "Input: grid = [[7]]\nOutput: 7"], "```python\nimport heapq\n\nclass Solution:\n    def swimInWater(self, grid):\n        n = len(grid)\n        heap = [(grid[0][0], 0, 0)]\n        seen = set()\n        while heap:\n            time, r, c = heapq.heappop(heap)\n            if (r, c) in seen: continue\n            seen.add((r, c))\n            if r == n - 1 and c == n - 1: return time\n            for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):\n                nr, nc = r + dr, c + dc\n                if 0 <= nr < n and 0 <= nc < n and (nr, nc) not in seen:\n                    heapq.heappush(heap, (max(time, grid[nr][nc]), nr, nc))\n```", "class Solution:\n    def swimInWater(self, grid):\n        pass"));

problems.push(makeProblem(97, "alien-dictionary", "Alien Dictionary", "Hard", ["Array", "String", "Depth-First Search", "Breadth-First Search", "Graph", "Topological Sort"], "alienOrder", [
  caseFrom({ words: ["wrt", "wrf", "er", "ett", "rftt"] }, "wertf"),
  caseFrom({ words: ["z", "x"] }, "zx"),
  caseFrom({ words: ["abc", "ab"] }, "")
], (seed) => { const samples = [[["za","zb","ca","cb"], "azbc"], [["baa","abcd","abca","cab","cad"], alienOrder(["baa","abcd","abca","cab","cad"])], [["x","x"], "x"], [["abc","ab"], ""]]; const [words, expected] = samples[seed % samples.length]; return caseFrom({ words }, expected); }, "Infer one valid character ordering from words sorted according to an unknown alphabet. Return an empty string when the ordering is impossible.", ["Input: words = [wrt,wrf,er,ett,rftt]\nOutput: wertf", "Input: words = [z,x]\nOutput: zx", "Input: words = [abc,ab]\nOutput: \"\""], "```python\nfrom collections import defaultdict, deque\n\nclass Solution:\n    def alienOrder(self, words):\n        chars = set(''.join(words))\n        graph = {ch: set() for ch in chars}\n        indeg = {ch: 0 for ch in chars}\n        for a, b in zip(words, words[1:]):\n            if len(a) > len(b) and a.startswith(b): return ''\n            for x, y in zip(a, b):\n                if x != y:\n                    if y not in graph[x]: graph[x].add(y); indeg[y] += 1\n                    break\n        queue = deque(sorted(ch for ch in chars if indeg[ch] == 0))\n        out = []\n        while queue:\n            ch = queue.popleft(); out.append(ch)\n            for nxt in sorted(graph[ch]):\n                indeg[nxt] -= 1\n                if indeg[nxt] == 0: queue.append(nxt)\n        return ''.join(out) if len(out) == len(chars) else ''\n```", "class Solution:\n    def alienOrder(self, words):\n        pass", alienChecker));

problems.push(makeProblem(98, "cheapest-flights-within-k-stops", "Cheapest Flights Within K Stops", "Medium", ["Dynamic Programming", "Depth-First Search", "Breadth-First Search", "Graph", "Heap", "Shortest Path"], "findCheapestPrice", [
  caseFrom({ n: 4, flights: [[0, 1, 100], [1, 2, 100], [2, 3, 100], [0, 3, 500]], src: 0, dst: 3, k: 1 }, 500),
  caseFrom({ n: 3, flights: [[0, 1, 100], [1, 2, 100], [0, 2, 500]], src: 0, dst: 2, k: 1 }, 200),
  caseFrom({ n: 3, flights: [[0, 1, 100], [1, 2, 100]], src: 0, dst: 2, k: 0 }, -1)
], (seed) => { const n = 3 + (seed % 6); const flights = []; for (let i = 0; i < n - 1; i += 1) flights.push([i, i + 1, 20 + ((seed + i) % 30)]); flights.push([0, n - 1, 200 + seed]); const k = seed % n; return caseFrom({ n, flights, src: 0, dst: n - 1, k }, cheapest(n, flights, 0, n - 1, k)); }, "Return the cheapest price from `src` to `dst` using at most `k` stops, or `-1` if no such route exists.", ["Input: n = 4, flights = [[0,1,100],[1,2,100],[2,3,100],[0,3,500]], src = 0, dst = 3, k = 1\nOutput: 500", "Input: n = 3, flights = [[0,1,100],[1,2,100],[0,2,500]], src = 0, dst = 2, k = 1\nOutput: 200", "Input: n = 3, flights = [[0,1,100],[1,2,100]], src = 0, dst = 2, k = 0\nOutput: -1"], "```python\nclass Solution:\n    def findCheapestPrice(self, n, flights, src, dst, k):\n        prices = [float('inf')] * n\n        prices[src] = 0\n        for _ in range(k + 1):\n            nxt = prices[:]\n            for u, v, w in flights:\n                if prices[u] + w < nxt[v]: nxt[v] = prices[u] + w\n            prices = nxt\n        return -1 if prices[dst] == float('inf') else prices[dst]\n```", "class Solution:\n    def findCheapestPrice(self, n, flights, src, dst, k):\n        pass"));

for (const problem of problems) {
  writeProblem(problem);
}

console.log(`Generated ${problems.length} graph problem packs.`);
