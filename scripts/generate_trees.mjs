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

function mix(seed, salt = 0) {
  let value = (seed + 0x9e3779b9 + salt * 0x85ebca6b) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d) >>> 0;
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b) >>> 0;
  value ^= value >>> 16;
  return value >>> 0;
}

function treeNode(values, extra = {}) {
  return { __elite_type: "tree_node", values, ...extra };
}

function treeRef(value) {
  return { __elite_type: "tree_ref", value };
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

function normalize(values) {
  const out = [...values];
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}

function node(val, left = null, right = null) {
  return { val, left, right };
}

function fromArray(values) {
  if (!values.length || values[0] === null) return null;
  const rootNode = node(values[0]);
  const queue = [rootNode];
  let index = 1;
  while (queue.length && index < values.length) {
    const current = queue.shift();
    const leftValue = values[index++];
    if (leftValue !== undefined && leftValue !== null) {
      current.left = node(leftValue);
      queue.push(current.left);
    }
    const rightValue = values[index++];
    if (rightValue !== undefined && rightValue !== null) {
      current.right = node(rightValue);
      queue.push(current.right);
    }
  }
  return rootNode;
}

function toArray(rootNode) {
  if (!rootNode) return [];
  const out = [];
  const queue = [rootNode];
  while (queue.length) {
    const current = queue.shift();
    if (!current) {
      out.push(null);
      continue;
    }
    out.push(current.val);
    queue.push(current.left);
    queue.push(current.right);
  }
  return normalize(out);
}

function clone(rootNode) {
  if (!rootNode) return null;
  return node(rootNode.val, clone(rootNode.left), clone(rootNode.right));
}

function randomTreeValues(seed, maxSize = 31) {
  if (seed % 17 === 0) return [];
  if (seed % 11 === 0) {
    const depth = 1 + (mix(seed, 30) % 28);
    const values = [];
    for (let i = 0; i < depth; i += 1) {
      values.push(((seed * 19 + i * 11) % 61) - 30);
      if (i < depth - 1) values.push(null);
    }
    return normalize(values);
  }
  if (seed % 13 === 0) {
    const depth = 1 + (mix(seed, 31) % 28);
    const values = [];
    for (let i = 0; i < depth; i += 1) {
      values.push(((seed * 23 + i * 17) % 61) - 30);
      if (i < depth - 1) values.push(null);
    }
    return normalize(values);
  }
  const length = 1 + (seed % maxSize);
  const values = [];
  for (let i = 0; i < length; i += 1) {
    values.push(((seed * 19 + i * 11) % 61) - 30);
  }
  for (let i = 1; i < values.length; i += 1) {
    if (i > 2 && (seed + i) % 6 === 0) values[i] = null;
  }
  return normalize(values);
}

function unbalancedTreeValues(seed) {
  const depth = 4 + (mix(seed, 460) % 28);
  const values = [];
  for (let i = 0; i < depth; i += 1) {
    values.push((mix(seed, i + 461) % 101) - 50);
    if (i < depth - 1) values.push(null);
  }
  return normalize(values);
}

function completeTreeValues(seed) {
  const length = 1 + (mix(seed, 490) % 63);
  return Array.from({ length }, (_, i) => (mix(seed, i + 491) % 101) - 50);
}

function invert(rootNode) {
  if (!rootNode) return null;
  const left = invert(rootNode.left);
  rootNode.left = invert(rootNode.right);
  rootNode.right = left;
  return rootNode;
}

function depth(rootNode) {
  return rootNode ? 1 + Math.max(depth(rootNode.left), depth(rootNode.right)) : 0;
}

function diameter(rootNode) {
  let best = 0;
  function height(current) {
    if (!current) return 0;
    const left = height(current.left);
    const right = height(current.right);
    best = Math.max(best, left + right);
    return 1 + Math.max(left, right);
  }
  height(rootNode);
  return best;
}

function balanced(rootNode) {
  function height(current) {
    if (!current) return 0;
    const left = height(current.left);
    const right = height(current.right);
    if (left < 0 || right < 0 || Math.abs(left - right) > 1) return -1;
    return 1 + Math.max(left, right);
  }
  return height(rootNode) >= 0;
}

function sameTree(a, b) {
  if (!a || !b) return a === b;
  return a.val === b.val && sameTree(a.left, b.left) && sameTree(a.right, b.right);
}

function subtree(rootNode, subRoot) {
  if (!subRoot) return true;
  if (!rootNode) return false;
  return sameTree(rootNode, subRoot) || subtree(rootNode.left, subRoot) || subtree(rootNode.right, subRoot);
}

function levelOrder(rootNode) {
  if (!rootNode) return [];
  const out = [];
  const queue = [rootNode];
  while (queue.length) {
    const level = [];
    for (let i = queue.length; i > 0; i -= 1) {
      const current = queue.shift();
      level.push(current.val);
      if (current.left) queue.push(current.left);
      if (current.right) queue.push(current.right);
    }
    out.push(level);
  }
  return out;
}

function rightSide(rootNode) {
  return levelOrder(rootNode).map((level) => level[level.length - 1]);
}

function goodNodes(rootNode) {
  function walk(current, best) {
    if (!current) return 0;
    const good = current.val >= best ? 1 : 0;
    const nextBest = Math.max(best, current.val);
    return good + walk(current.left, nextBest) + walk(current.right, nextBest);
  }
  return walk(rootNode, Number.NEGATIVE_INFINITY);
}

function isValidBST(rootNode) {
  function walk(current, low, high) {
    if (!current) return true;
    if (current.val <= low || current.val >= high) return false;
    return walk(current.left, low, current.val) && walk(current.right, current.val, high);
  }
  return walk(rootNode, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
}

function insertBST(rootNode, value) {
  if (!rootNode) return node(value);
  if (value < rootNode.val) rootNode.left = insertBST(rootNode.left, value);
  else rootNode.right = insertBST(rootNode.right, value);
  return rootNode;
}

function uniqueValues(seed, length = 7 + (mix(seed, 80) % 24)) {
  const values = [];
  let candidate = 0;
  while (values.length < length) {
    const value = (mix(seed + candidate, values.length + 90) % 2001) - 1000;
    if (!values.includes(value)) values.push(value);
    candidate += 1;
  }
  return values;
}

function bstValues(seed, length = 7 + (mix(seed, 80) % 24)) {
  let rootNode = null;
  for (const value of uniqueValues(seed, length)) rootNode = insertBST(rootNode, value);
  return toArray(rootNode);
}

function kthSmallest(values, k) {
  const sorted = [];
  function walk(current) {
    if (!current) return;
    walk(current.left);
    sorted.push(current.val);
    walk(current.right);
  }
  walk(fromArray(values));
  return sorted[k - 1];
}

function lcaBST(rootNode, p, q) {
  let current = rootNode;
  const low = Math.min(p, q);
  const high = Math.max(p, q);
  while (current) {
    if (current.val > high) current = current.left;
    else if (current.val < low) current = current.right;
    else return current.val;
  }
  return null;
}

function preorder(rootNode, out = []) {
  if (!rootNode) return out;
  out.push(rootNode.val);
  preorder(rootNode.left, out);
  preorder(rootNode.right, out);
  return out;
}

function inorder(rootNode, out = []) {
  if (!rootNode) return out;
  inorder(rootNode.left, out);
  out.push(rootNode.val);
  inorder(rootNode.right, out);
  return out;
}

function buildFromPreIn(pre, ino) {
  const index = new Map(ino.map((value, i) => [value, i]));
  let preIndex = 0;
  function build(left, right) {
    if (left > right) return null;
    const value = pre[preIndex++];
    const mid = index.get(value);
    return node(value, build(left, mid - 1), build(mid + 1, right));
  }
  return build(0, ino.length - 1);
}

function maxPathSum(rootNode) {
  let best = Number.NEGATIVE_INFINITY;
  function gain(current) {
    if (!current) return 0;
    const left = Math.max(0, gain(current.left));
    const right = Math.max(0, gain(current.right));
    best = Math.max(best, current.val + left + right);
    return current.val + Math.max(left, right);
  }
  gain(rootNode);
  return best;
}

function mutateOne(values, seed) {
  const copy = [...values];
  if (!copy.length) return [seed];
  const index = seed % copy.length;
  copy[index] = copy[index] === null ? seed : copy[index] + 101;
  return normalize(copy);
}

const treeConstraints = [
  "The judge provides a `TreeNode` class with `val`, `left`, and `right` fields.",
  "Trees are shown in level-order form with `null` for missing children.",
  "Node counts are sized for local offline execution."
];

const problems = [
  (() => {
    const visible = [
      caseFrom({ root: treeNode([4, 2, 7, 1, 3, 6, 9]) }, [4, 7, 2, 9, 6, 3, 1]),
      caseFrom({ root: treeNode([2, 1, 3]) }, [2, 3, 1]),
      caseFrom({ root: treeNode([]) }, [])
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const values = randomTreeValues(seed);
      return caseFrom({ root: treeNode(values) }, toArray(invert(fromArray(values))));
    });
    return {
      id: 46,
      slug: "invert-binary-tree",
      title: "Invert Binary Tree",
      difficulty: "Easy",
      tags: ["Tree", "Depth-First Search", "Breadth-First Search", "Binary Tree"],
      method: "invertTree",
      visible: visibleCount,
      cases,
      statement: markdown("Invert Binary Tree", "Mirror a binary tree by swapping the left and right child of every node, then return the root.", ["Input: root = [4,2,7,1,3,6,9]\nOutput: [4,7,2,9,6,3,1]", "Input: root = [2,1,3]\nOutput: [2,3,1]", "Input: root = []\nOutput: []"], treeConstraints),
      editorial: "Recursively swap children after inverting each subtree, or perform the same swaps with a queue.",
      solution: "```python\nclass Solution:\n    def invertTree(self, root):\n        if not root:\n            return None\n        root.left, root.right = self.invertTree(root.right), self.invertTree(root.left)\n        return root\n```",
      hints: ["Every node can be handled independently.", "The root value never changes."],
      starter: "class Solution:\n    def invertTree(self, root):\n        pass"
    };
  })(),
  (() => {
    const visible = [
      caseFrom({ root: treeNode([8, 3, 10, 1, 6, null, 14]) }, 3),
      caseFrom({ root: treeNode([1, null, 2, null, 3]) }, 3),
      caseFrom({ root: treeNode([]) }, 0)
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const values = randomTreeValues(seed);
      return caseFrom({ root: treeNode(values) }, depth(fromArray(values)));
    });
    return {
      id: 47,
      slug: "maximum-depth-of-binary-tree",
      title: "Maximum Depth of Binary Tree",
      difficulty: "Easy",
      tags: ["Tree", "Depth-First Search", "Breadth-First Search", "Binary Tree"],
      method: "maxDepth",
      visible: visibleCount,
      cases,
      statement: markdown("Maximum Depth of Binary Tree", "Return the number of nodes on the longest path from the root down to a leaf.", ["Input: root = [8,3,10,1,6,null,14]\nOutput: 3", "Input: root = [1,null,2,null,3]\nOutput: 3", "Input: root = []\nOutput: 0"], treeConstraints),
      editorial: "The depth of a null node is zero. Each real node contributes one plus the larger depth of its children.",
      solution: "```python\nclass Solution:\n    def maxDepth(self, root):\n        if not root:\n            return 0\n        return 1 + max(self.maxDepth(root.left), self.maxDepth(root.right))\n```",
      hints: ["Think recursively from a leaf upward.", "A missing child contributes depth zero."],
      starter: "class Solution:\n    def maxDepth(self, root):\n        pass"
    };
  })(),
  (() => {
    const visible = [
      caseFrom({ root: treeNode([1, 2, 3, 4, 5]) }, 3),
      caseFrom({ root: treeNode([1, 2]) }, 1),
      caseFrom({ root: treeNode([]) }, 0)
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const values = randomTreeValues(seed);
      return caseFrom({ root: treeNode(values) }, diameter(fromArray(values)));
    });
    return {
      id: 48,
      slug: "diameter-of-binary-tree",
      title: "Diameter of Binary Tree",
      difficulty: "Easy",
      tags: ["Tree", "Depth-First Search", "Binary Tree"],
      method: "diameterOfBinaryTree",
      visible: visibleCount,
      cases,
      statement: markdown("Diameter of Binary Tree", "Return the largest number of edges on any path between two nodes in the tree.", ["Input: root = [1,2,3,4,5]\nOutput: 3", "Input: root = [1,2]\nOutput: 1", "Input: root = []\nOutput: 0"], treeConstraints),
      editorial: "For each node, a path through it has `left_height + right_height` edges. Track the largest such value while computing heights.",
      solution: "```python\nclass Solution:\n    def diameterOfBinaryTree(self, root):\n        best = 0\n        def height(node):\n            nonlocal best\n            if not node:\n                return 0\n            left = height(node.left)\n            right = height(node.right)\n            best = max(best, left + right)\n            return 1 + max(left, right)\n        height(root)\n        return best\n```",
      hints: ["The best path may not pass through the root.", "Height and diameter can be computed in one DFS."],
      starter: "class Solution:\n    def diameterOfBinaryTree(self, root):\n        pass"
    };
  })(),
  (() => {
    const visible = [
      caseFrom({ root: treeNode([3, 9, 20, null, null, 15, 7]) }, true),
      caseFrom({ root: treeNode([1, 2, 2, 3, null, null, null, 4]) }, false),
      caseFrom({ root: treeNode([]) }, true)
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const values = seed % 3 === 0 ? unbalancedTreeValues(seed) : seed % 3 === 1 ? completeTreeValues(seed) : randomTreeValues(seed, 63);
      return caseFrom({ root: treeNode(values) }, balanced(fromArray(values)));
    });
    return {
      id: 49,
      slug: "balanced-binary-tree",
      title: "Balanced Binary Tree",
      difficulty: "Easy",
      tags: ["Tree", "Depth-First Search", "Binary Tree"],
      method: "isBalanced",
      visible: visibleCount,
      cases,
      statement: markdown("Balanced Binary Tree", "Return whether every node has left and right subtree heights that differ by at most one.", ["Input: root = [3,9,20,null,null,15,7]\nOutput: true", "Input: root = [1,2,2,3,null,null,null,4]\nOutput: false", "Input: root = []\nOutput: true"], treeConstraints),
      editorial: "Return subtree height when balanced and a sentinel when imbalance is found. This avoids recomputing heights repeatedly.",
      solution: "```python\nclass Solution:\n    def isBalanced(self, root):\n        def height(node):\n            if not node:\n                return 0\n            left = height(node.left)\n            right = height(node.right)\n            if left == -1 or right == -1 or abs(left - right) > 1:\n                return -1\n            return 1 + max(left, right)\n        return height(root) != -1\n```",
      hints: ["You need both height and validity for each subtree.", "Short-circuit once any subtree is unbalanced."],
      starter: "class Solution:\n    def isBalanced(self, root):\n        pass"
    };
  })(),
  (() => {
    const visible = [
      caseFrom({ p: treeNode([1, 2, 3]), q: treeNode([1, 2, 3]) }, true),
      caseFrom({ p: treeNode([1, 2]), q: treeNode([1, null, 2]) }, false),
      caseFrom({ p: treeNode([]), q: treeNode([]) }, true)
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const values = randomTreeValues(seed);
      const other = seed % 4 === 0 ? mutateOne(values, seed) : values;
      return caseFrom({ p: treeNode(values), q: treeNode(other) }, sameTree(fromArray(values), fromArray(other)));
    });
    return {
      id: 50,
      slug: "same-tree",
      title: "Same Tree",
      difficulty: "Easy",
      tags: ["Tree", "Depth-First Search", "Breadth-First Search", "Binary Tree"],
      method: "isSameTree",
      visible: visibleCount,
      cases,
      statement: markdown("Same Tree", "Return whether two binary trees have identical structure and identical values at every matching node.", ["Input: p = [1,2,3], q = [1,2,3]\nOutput: true", "Input: p = [1,2], q = [1,null,2]\nOutput: false", "Input: p = [], q = []\nOutput: true"], treeConstraints),
      editorial: "Compare the roots, then recursively compare left children and right children. Missing nodes must match too.",
      solution: "```python\nclass Solution:\n    def isSameTree(self, p, q):\n        if not p or not q:\n            return p is q\n        return p.val == q.val and self.isSameTree(p.left, q.left) and self.isSameTree(p.right, q.right)\n```",
      hints: ["Both value and shape matter.", "Two missing nodes are equal."],
      starter: "class Solution:\n    def isSameTree(self, p, q):\n        pass"
    };
  })(),
  (() => {
    const visible = [
      caseFrom({ root: treeNode([5, 3, 8, 2, 4, 7, 9]), subRoot: treeNode([3, 2, 4]) }, true),
      caseFrom({ root: treeNode([5, 3, 8, 2, 4]), subRoot: treeNode([3, 2, 6]) }, false),
      caseFrom({ root: treeNode([1]), subRoot: treeNode([]) }, true)
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const values = randomTreeValues(seed);
      const rootNode = fromArray(values);
      let sub = rootNode && seed % 2 === 0 ? rootNode.left || rootNode : fromArray(mutateOne(values.slice(0, Math.max(1, Math.floor(values.length / 2))), seed));
      return caseFrom({ root: treeNode(values), subRoot: treeNode(toArray(sub)) }, subtree(rootNode, sub));
    });
    return {
      id: 51,
      slug: "subtree-of-another-tree",
      title: "Subtree of Another Tree",
      difficulty: "Easy",
      tags: ["Tree", "Depth-First Search", "String Matching", "Binary Tree", "Hash Function"],
      method: "isSubtree",
      visible: visibleCount,
      cases,
      statement: markdown("Subtree of Another Tree", "Return whether `subRoot` appears inside `root` with the same values and structure.", ["Input: root = [5,3,8,2,4,7,9], subRoot = [3,2,4]\nOutput: true", "Input: root = [5,3,8,2,4], subRoot = [3,2,6]\nOutput: false", "Input: root = [1], subRoot = []\nOutput: true"], treeConstraints),
      editorial: "At each node in the main tree, check whether the full subtree matches. If not, keep searching down the left and right sides.",
      solution: "```python\nclass Solution:\n    def isSubtree(self, root, subRoot):\n        def same(a, b):\n            if not a or not b:\n                return a is b\n            return a.val == b.val and same(a.left, b.left) and same(a.right, b.right)\n        if not subRoot:\n            return True\n        if not root:\n            return False\n        return same(root, subRoot) or self.isSubtree(root.left, subRoot) or self.isSubtree(root.right, subRoot)\n```",
      hints: ["A candidate match starts at a node with the same root value.", "Empty `subRoot` is contained by definition in this pack."],
      starter: "class Solution:\n    def isSubtree(self, root, subRoot):\n        pass"
    };
  })(),
  (() => {
    const visible = [
      caseFrom({ root: treeNode([6, 2, 8, 0, 4, 7, 9, null, null, 3, 5]), p: treeRef(2), q: treeRef(8) }, 6),
      caseFrom({ root: treeNode([6, 2, 8, 0, 4, 7, 9, null, null, 3, 5]), p: treeRef(2), q: treeRef(4) }, 2),
      caseFrom({ root: treeNode([3, 1, 5]), p: treeRef(1), q: treeRef(5) }, 3)
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const values = bstValues(seed);
      const vals = uniqueValues(seed).sort((a, b) => a - b);
      const p = vals[seed % vals.length];
      const q = vals[(seed * 3 + 1) % vals.length];
      return caseFrom({ root: treeNode(values), p: treeRef(p), q: treeRef(q) }, lcaBST(fromArray(values), p, q));
    });
    return {
      id: 52,
      slug: "lowest-common-ancestor-of-a-binary-search-tree",
      title: "Lowest Common Ancestor of a Binary Search Tree",
      difficulty: "Medium",
      tags: ["Tree", "Depth-First Search", "Binary Search Tree", "Binary Tree"],
      method: "lowestCommonAncestor",
      visible: visibleCount,
      cases,
      statement: markdown("Lowest Common Ancestor of a Binary Search Tree", "Given a BST and two existing nodes `p` and `q`, return their lowest common ancestor. The output is shown as that node's value.", ["Input: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8\nOutput: 6", "Input: root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 4\nOutput: 2", "Input: root = [3,1,5], p = 1, q = 5\nOutput: 3"], [...treeConstraints, "All BST values are unique.", "`p` and `q` are present in the tree."]),
      editorial: "In a BST, values smaller than the current node are on the left and larger values are on the right. The split point between `p` and `q` is the LCA.",
      solution: "```python\nclass Solution:\n    def lowestCommonAncestor(self, root, p, q):\n        low, high = sorted((p.val, q.val))\n        node = root\n        while node:\n            if node.val > high:\n                node = node.left\n            elif node.val < low:\n                node = node.right\n            else:\n                return node\n```",
      hints: ["Use the BST ordering instead of searching every path.", "If one target equals the current node, the current node is the answer."],
      starter: "class Solution:\n    def lowestCommonAncestor(self, root, p, q):\n        pass"
    };
  })(),
  (() => {
    const visible = [
      caseFrom({ root: treeNode([3, 9, 20, null, null, 15, 7]) }, [[3], [9, 20], [15, 7]]),
      caseFrom({ root: treeNode([1]) }, [[1]]),
      caseFrom({ root: treeNode([]) }, [])
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const values = randomTreeValues(seed);
      return caseFrom({ root: treeNode(values) }, levelOrder(fromArray(values)));
    });
    return {
      id: 53,
      slug: "binary-tree-level-order-traversal",
      title: "Binary Tree Level Order Traversal",
      difficulty: "Medium",
      tags: ["Tree", "Breadth-First Search", "Binary Tree"],
      method: "levelOrder",
      visible: visibleCount,
      cases,
      statement: markdown("Binary Tree Level Order Traversal", "Return the node values grouped by depth from top to bottom and left to right within each level.", ["Input: root = [3,9,20,null,null,15,7]\nOutput: [[3],[9,20],[15,7]]", "Input: root = [1]\nOutput: [[1]]", "Input: root = []\nOutput: []"], treeConstraints),
      editorial: "Breadth-first search naturally processes the tree one level at a time. Capture the queue size before each level.",
      solution: "```python\nfrom collections import deque\n\nclass Solution:\n    def levelOrder(self, root):\n        if not root:\n            return []\n        out = []\n        queue = deque([root])\n        while queue:\n            level = []\n            for _ in range(len(queue)):\n                node = queue.popleft()\n                level.append(node.val)\n                if node.left:\n                    queue.append(node.left)\n                if node.right:\n                    queue.append(node.right)\n            out.append(level)\n        return out\n```",
      hints: ["A queue gives nodes in depth order.", "The current queue length marks the boundary of a level."],
      starter: "class Solution:\n    def levelOrder(self, root):\n        pass"
    };
  })(),
  (() => {
    const visible = [
      caseFrom({ root: treeNode([1, 2, 3, null, 5, null, 4]) }, [1, 3, 4]),
      caseFrom({ root: treeNode([7, 8]) }, [7, 8]),
      caseFrom({ root: treeNode([]) }, [])
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const values = randomTreeValues(seed);
      return caseFrom({ root: treeNode(values) }, rightSide(fromArray(values)));
    });
    return {
      id: 54,
      slug: "binary-tree-right-side-view",
      title: "Binary Tree Right Side View",
      difficulty: "Medium",
      tags: ["Tree", "Depth-First Search", "Breadth-First Search", "Binary Tree"],
      method: "rightSideView",
      visible: visibleCount,
      cases,
      statement: markdown("Binary Tree Right Side View", "Return the values visible when looking at the tree from its right side, one value per depth.", ["Input: root = [1,2,3,null,5,null,4]\nOutput: [1,3,4]", "Input: root = [7,8]\nOutput: [7,8]", "Input: root = []\nOutput: []"], treeConstraints),
      editorial: "During BFS, the final node processed at each level is the right-side value.",
      solution: "```python\nfrom collections import deque\n\nclass Solution:\n    def rightSideView(self, root):\n        if not root:\n            return []\n        out = []\n        queue = deque([root])\n        while queue:\n            last = None\n            for _ in range(len(queue)):\n                last = queue.popleft()\n                if last.left:\n                    queue.append(last.left)\n                if last.right:\n                    queue.append(last.right)\n            out.append(last.val)\n        return out\n```",
      hints: ["Track the last node of every level.", "DFS can also visit right children before left children."],
      starter: "class Solution:\n    def rightSideView(self, root):\n        pass"
    };
  })(),
  (() => {
    const visible = [
      caseFrom({ root: treeNode([3, 1, 4, 3, null, 1, 5]) }, 4),
      caseFrom({ root: treeNode([2, 2, 2]) }, 3),
      caseFrom({ root: treeNode([]) }, 0)
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const values = seed % 4 === 0 ? Array.from({ length: 1 + (mix(seed, 500) % 28) }, (_, index) => index) : randomTreeValues(seed);
      return caseFrom({ root: treeNode(values) }, goodNodes(fromArray(values)));
    });
    return {
      id: 55,
      slug: "count-good-nodes-in-binary-tree",
      title: "Count Good Nodes in Binary Tree",
      difficulty: "Medium",
      tags: ["Tree", "Depth-First Search", "Breadth-First Search", "Binary Tree"],
      method: "goodNodes",
      visible: visibleCount,
      cases,
      statement: markdown("Count Good Nodes in Binary Tree", "A node is good when no ancestor on the path from the root has a value greater than it. Return the number of good nodes.", ["Input: root = [3,1,4,3,null,1,5]\nOutput: 4", "Input: root = [2,2,2]\nOutput: 3", "Input: root = []\nOutput: 0"], treeConstraints),
      editorial: "DFS while carrying the maximum value seen so far. A node is counted when its value is at least that maximum.",
      solution: "```python\nclass Solution:\n    def goodNodes(self, root):\n        def dfs(node, best):\n            if not node:\n                return 0\n            count = 1 if node.val >= best else 0\n            best = max(best, node.val)\n            return count + dfs(node.left, best) + dfs(node.right, best)\n        return dfs(root, float('-inf'))\n```",
      hints: ["Only ancestors matter, not siblings.", "Carry the best value along the current path."],
      starter: "class Solution:\n    def goodNodes(self, root):\n        pass"
    };
  })(),
  (() => {
    const visible = [
      caseFrom({ root: treeNode([5, 1, 7, null, null, 6, 9]) }, true),
      caseFrom({ root: treeNode([5, 1, 7, null, null, 4, 9]) }, false),
      caseFrom({ root: treeNode([2, 2, 3]) }, false)
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const values = seed % 3 === 0 ? [10, 5, 15, null, null, 6, 20] : bstValues(seed);
      return caseFrom({ root: treeNode(values) }, isValidBST(fromArray(values)));
    });
    return {
      id: 56,
      slug: "validate-binary-search-tree",
      title: "Validate Binary Search Tree",
      difficulty: "Medium",
      tags: ["Tree", "Depth-First Search", "Binary Search Tree", "Binary Tree"],
      method: "isValidBST",
      visible: visibleCount,
      cases,
      statement: markdown("Validate Binary Search Tree", "Return whether a binary tree satisfies strict BST ordering: every left descendant is smaller and every right descendant is larger.", ["Input: root = [5,1,7,null,null,6,9]\nOutput: true", "Input: root = [5,1,7,null,null,4,9]\nOutput: false", "Input: root = [2,2,3]\nOutput: false"], treeConstraints),
      editorial: "Carry an exclusive lower and upper bound for every subtree. A node must fit inside all ancestor-imposed bounds.",
      solution: "```python\nclass Solution:\n    def isValidBST(self, root):\n        def valid(node, low, high):\n            if not node:\n                return True\n            if node.val <= low or node.val >= high:\n                return False\n            return valid(node.left, low, node.val) and valid(node.right, node.val, high)\n        return valid(root, float('-inf'), float('inf'))\n```",
      hints: ["Checking only parent-child relationships is not enough.", "Bounds become tighter as recursion descends."],
      starter: "class Solution:\n    def isValidBST(self, root):\n        pass"
    };
  })(),
  (() => {
    const visible = [
      caseFrom({ root: treeNode([5, 3, 8, 2, 4, 7, 9]), k: 3 }, 4),
      caseFrom({ root: treeNode([2, 1, 3]), k: 1 }, 1),
      caseFrom({ root: treeNode([4, 2, 6, 1, 3, 5, 7]), k: 7 }, 7)
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const values = bstValues(seed);
      const sorted = [];
      inorder(fromArray(values), sorted);
      const k = 1 + (seed % sorted.length);
      return caseFrom({ root: treeNode(values), k }, kthSmallest(values, k));
    });
    return {
      id: 57,
      slug: "kth-smallest-element-in-a-bst",
      title: "Kth Smallest Element in a BST",
      difficulty: "Medium",
      tags: ["Tree", "Depth-First Search", "Binary Search Tree", "Binary Tree"],
      method: "kthSmallest",
      visible: visibleCount,
      cases,
      statement: markdown("Kth Smallest Element in a BST", "Return the `k`th smallest value in a binary search tree, using one-based indexing.", ["Input: root = [5,3,8,2,4,7,9], k = 3\nOutput: 4", "Input: root = [2,1,3], k = 1\nOutput: 1", "Input: root = [4,2,6,1,3,5,7], k = 7\nOutput: 7"], [...treeConstraints, "`1 <= k <= number of nodes`"]),
      editorial: "Inorder traversal of a BST visits values in sorted order. Stop once the kth value is reached.",
      solution: "```python\nclass Solution:\n    def kthSmallest(self, root, k):\n        stack = []\n        node = root\n        while stack or node:\n            while node:\n                stack.append(node)\n                node = node.left\n            node = stack.pop()\n            k -= 1\n            if k == 0:\n                return node.val\n            node = node.right\n```",
      hints: ["BST inorder traversal is sorted.", "An iterative stack can stop early."],
      starter: "class Solution:\n    def kthSmallest(self, root, k):\n        pass"
    };
  })(),
  (() => {
    const exampleRoot = fromArray([3, 9, 20, null, null, 15, 7]);
    const visible = [
      caseFrom({ preorder: preorder(exampleRoot), inorder: inorder(exampleRoot) }, toArray(exampleRoot)),
      caseFrom({ preorder: [1], inorder: [1] }, [1]),
      caseFrom({ preorder: [2, 1, 3], inorder: [1, 2, 3] }, [2, 1, 3])
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const base = randomTreeValues(seed);
      const rootNode = fromArray((base.length ? base : [seed]).map((value, index) => value === null ? null : value * 100 + index));
      return caseFrom({ preorder: preorder(rootNode), inorder: inorder(rootNode) }, toArray(rootNode));
    });
    return {
      id: 58,
      slug: "construct-binary-tree-from-preorder-and-inorder-traversal",
      title: "Construct Binary Tree from Preorder and Inorder Traversal",
      difficulty: "Medium",
      tags: ["Array", "Hash Table", "Divide and Conquer", "Tree", "Binary Tree"],
      method: "buildTree",
      visible: visibleCount,
      cases,
      statement: markdown("Construct Binary Tree from Preorder and Inorder Traversal", "Given preorder and inorder traversals for the same binary tree with unique values, rebuild and return the tree.", ["Input: preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]\nOutput: [3,9,20,null,null,15,7]", "Input: preorder = [1], inorder = [1]\nOutput: [1]", "Input: preorder = [2,1,3], inorder = [1,2,3]\nOutput: [2,1,3]"], [...treeConstraints, "All node values are unique."]),
      editorial: "The first preorder value is the root. Its position in inorder splits the left and right subtrees.",
      solution: "```python\nclass Solution:\n    def buildTree(self, preorder, inorder):\n        positions = {value: index for index, value in enumerate(inorder)}\n        self.index = 0\n        def build(left, right):\n            if left > right:\n                return None\n            value = preorder[self.index]\n            self.index += 1\n            mid = positions[value]\n            root = TreeNode(value)\n            root.left = build(left, mid - 1)\n            root.right = build(mid + 1, right)\n            return root\n        return build(0, len(inorder) - 1)\n```",
      hints: ["Preorder tells you the next root.", "Inorder tells you how many nodes belong to each side."],
      starter: "class Solution:\n    def buildTree(self, preorder, inorder):\n        pass"
    };
  })(),
  (() => {
    const visible = [
      caseFrom({ root: treeNode([1, 2, 3]) }, 6),
      caseFrom({ root: treeNode([-10, 9, 20, null, null, 15, 7]) }, 42),
      caseFrom({ root: treeNode([-3]) }, -3)
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const base = randomTreeValues(seed);
      const values = (base.length ? base : [seed - 20]).map((value) => value === null ? null : value - (seed % 9));
      return caseFrom({ root: treeNode(values) }, maxPathSum(fromArray(values)));
    });
    return {
      id: 59,
      slug: "binary-tree-maximum-path-sum",
      title: "Binary Tree Maximum Path Sum",
      difficulty: "Hard",
      tags: ["Dynamic Programming", "Tree", "Depth-First Search", "Binary Tree"],
      method: "maxPathSum",
      visible: visibleCount,
      cases,
      statement: markdown("Binary Tree Maximum Path Sum", "A path may start and end at any nodes, but it must follow parent-child connections and cannot reuse a node. Return the maximum possible sum.", ["Input: root = [1,2,3]\nOutput: 6", "Input: root = [-10,9,20,null,null,15,7]\nOutput: 42", "Input: root = [-3]\nOutput: -3"], treeConstraints),
      editorial: "For each node, compute the best downward gain it can extend to its parent. Separately consider a path that bends through the node using both children.",
      solution: "```python\nclass Solution:\n    def maxPathSum(self, root):\n        best = float('-inf')\n        def gain(node):\n            nonlocal best\n            if not node:\n                return 0\n            left = max(0, gain(node.left))\n            right = max(0, gain(node.right))\n            best = max(best, node.val + left + right)\n            return node.val + max(left, right)\n        gain(root)\n        return best\n```",
      hints: ["A path returned upward can choose only one child side.", "The global answer can use both sides at the turning node."],
      starter: "class Solution:\n    def maxPathSum(self, root):\n        pass"
    };
  })(),
  (() => {
    const visible = [
      caseFrom({ root: treeNode([1, 2, 3, null, null, 4, 5]) }, [1, 2, 3, null, null, 4, 5]),
      caseFrom({ root: treeNode([]) }, []),
      caseFrom({ root: treeNode([9, null, 10]) }, [9, null, 10])
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const values = randomTreeValues(seed);
      return caseFrom({ root: treeNode(values) }, values);
    });
    return {
      id: 60,
      slug: "serialize-and-deserialize-binary-tree",
      title: "Serialize and Deserialize Binary Tree",
      difficulty: "Hard",
      tags: ["String", "Tree", "Depth-First Search", "Breadth-First Search", "Design", "Binary Tree"],
      method: "codecRoundTrip",
      visible: visibleCount,
      cases,
      statement: markdown("Serialize and Deserialize Binary Tree", "Design a codec that converts a binary tree to a string and back. The judge serializes then deserializes the supplied tree and compares the resulting shape and values.", ["Input: root = [1,2,3,null,null,4,5]\nOutput: [1,2,3,null,null,4,5]", "Input: root = []\nOutput: []", "Input: root = [9,null,10]\nOutput: [9,null,10]"], treeConstraints),
      editorial: "A preorder DFS with explicit null markers is compact and unambiguous. During decode, consume tokens in the same order.",
      solution: "```python\nclass Codec:\n    def serialize(self, root):\n        out = []\n        def dfs(node):\n            if not node:\n                out.append('#')\n                return\n            out.append(str(node.val))\n            dfs(node.left)\n            dfs(node.right)\n        dfs(root)\n        return ','.join(out)\n\n    def deserialize(self, data):\n        values = iter(data.split(','))\n        def dfs():\n            value = next(values)\n            if value == '#':\n                return None\n            node = TreeNode(int(value))\n            node.left = dfs()\n            node.right = dfs()\n            return node\n        return dfs()\n\nclass Solution:\n    def codecRoundTrip(self, root):\n        codec = Codec()\n        return codec.deserialize(codec.serialize(root))\n```",
      hints: ["Null markers are needed to preserve structure.", "Decode in the same traversal order used by encode."],
      starter: "class Codec:\n    def serialize(self, root):\n        pass\n\n    def deserialize(self, data):\n        pass\n\nclass Solution:\n    def codecRoundTrip(self, root):\n        codec = Codec()\n        return codec.deserialize(codec.serialize(root))"
    };
  })()
];

for (const problem of problems) {
  writeProblem(problem);
}

console.log(`Generated ${problems.length} tree problem packs.`);
