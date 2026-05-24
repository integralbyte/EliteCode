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

function listNode(values, extra = {}) {
  return { __elite_type: "list_node", values, ...extra };
}

function randomList(nodes) {
  return { __elite_type: "random_list", nodes };
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

function valuesFromSeed(seed, length = 1 + (seed % 11)) {
  return Array.from({ length }, (_, index) => ((seed * 17 + index * 9) % 41) - 20);
}

function sortedValues(seed, length = 1 + (seed % 9)) {
  const values = valuesFromSeed(seed, length).sort((a, b) => a - b);
  return values.map((value, index) => value + index);
}

function reorder(values) {
  const out = [];
  let left = 0;
  let right = values.length - 1;
  while (left <= right) {
    out.push(values[left]);
    if (left !== right) out.push(values[right]);
    left += 1;
    right -= 1;
  }
  return out;
}

function removeNth(values, n) {
  const copy = [...values];
  copy.splice(values.length - n, 1);
  return copy;
}

function addDigitLists(a, b) {
  const out = [];
  let carry = 0;
  const maxLength = Math.max(a.length, b.length);
  for (let i = 0; i < maxLength || carry; i += 1) {
    const sum = (a[i] ?? 0) + (b[i] ?? 0) + carry;
    out.push(sum % 10);
    carry = Math.floor(sum / 10);
  }
  return out;
}

function findDuplicate(nums) {
  const seen = new Set();
  for (const value of nums) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return -1;
}

function duplicateArray(seed, n = 2 + (seed % 12)) {
  const values = Array.from({ length: n }, (_, index) => index + 1);
  const duplicate = 1 + (seed % n);
  const insertAt = seed % (n + 1);
  values.splice(insertAt, 0, duplicate);
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = (seed * 7 + i * 3) % (i + 1);
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

function lruRun(operations, values) {
  let capacity = 0;
  const map = new Map();
  const out = [];
  const touch = (key) => {
    const value = map.get(key);
    map.delete(key);
    map.set(key, value);
    return value;
  };
  for (let i = 0; i < operations.length; i += 1) {
    const op = operations[i];
    const args = values[i];
    if (op === "LRUCache") {
      capacity = args[0];
      map.clear();
    } else if (op === "put") {
      const [key, value] = args;
      if (map.has(key)) map.delete(key);
      map.set(key, value);
      if (map.size > capacity) map.delete(map.keys().next().value);
    } else if (op === "get") {
      const [key] = args;
      out.push(map.has(key) ? touch(key) : -1);
    }
  }
  return out;
}

function lruSeed(seed) {
  const capacity = 2 + (seed % 4);
  const operations = ["LRUCache"];
  const values = [[capacity]];
  for (let i = 0; i < 14 + (seed % 7); i += 1) {
    const key = (seed + i * 2) % 7;
    if (i % 3 === 0) {
      operations.push("get");
      values.push([key]);
    } else {
      operations.push("put");
      values.push([key, seed * 10 + i]);
    }
  }
  operations.push("get");
  values.push([(seed + 1) % 7]);
  return { operations, values };
}

function reverseKGroup(values, k) {
  const out = [];
  for (let i = 0; i < values.length; i += k) {
    const chunk = values.slice(i, i + k);
    out.push(...(chunk.length === k ? chunk.reverse() : chunk));
  }
  return out;
}

function randomNodes(seed) {
  const length = 1 + (seed % 7);
  return Array.from({ length }, (_, index) => {
    const randomIndex = (seed + index * 2) % (length + 1);
    return [((seed + index) * 13) % 50, randomIndex === length ? null : randomIndex];
  });
}

function listOfSortedLists(seed) {
  const count = seed % 5;
  return Array.from({ length: count }, (_, index) => sortedValues(seed + index * 4, seed % 4 + index));
}

const commonListConstraints = [
  "The judge provides a `ListNode` class with `val` and `next` fields.",
  "Node values fit in normal signed integer range.",
  "The total number of nodes across one test case is kept small enough for local execution."
];

const problems = [
  (() => {
    const visible = [
      caseFrom({ head: listNode([2, 4, 6, 8]) }, [8, 6, 4, 2]),
      caseFrom({ head: listNode([7]) }, [7]),
      caseFrom({ head: listNode([]) }, [])
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const values = valuesFromSeed(seed, seed % 17);
      return caseFrom({ head: listNode(values) }, [...values].reverse());
    });
    return {
      id: 35,
      slug: "reverse-linked-list",
      title: "Reverse Linked List",
      difficulty: "Easy",
      tags: ["Linked List"],
      method: "reverseList",
      visible: visibleCount,
      cases,
      statement: markdown(
        "Reverse Linked List",
        "Given the head of a singly linked list, return the head of the same values in reverse order.",
        [
          "Input: head = [2,4,6,8]\nOutput: [8,6,4,2]",
          "Input: head = [7]\nOutput: [7]",
          "Input: head = []\nOutput: []"
        ],
        commonListConstraints,
        "Can you reverse the list without allocating another list of nodes?"
      ),
      editorial: "Walk through the list while carrying the previous node. Redirect each `next` pointer toward the previous node and advance until the old tail becomes the new head.",
      solution: "```python\nclass Solution:\n    def reverseList(self, head):\n        previous = None\n        current = head\n        while current:\n            nxt = current.next\n            current.next = previous\n            previous = current\n            current = nxt\n        return previous\n```",
      hints: ["Keep track of the node that should follow the current node after reversal.", "The old head should eventually point to `None`."],
      starter: "class Solution:\n    def reverseList(self, head):\n        pass"
    };
  })(),
  (() => {
    const visible = [
      caseFrom({ list1: listNode([-3, 1, 5]), list2: listNode([-2, 4, 6]) }, [-3, -2, 1, 4, 5, 6]),
      caseFrom({ list1: listNode([]), list2: listNode([0, 9]) }, [0, 9]),
      caseFrom({ list1: listNode([4]), list2: listNode([]) }, [4])
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const left = sortedValues(seed, seed % 10);
      const right = sortedValues(seed + 11, (seed * 2) % 10);
      return caseFrom({ list1: listNode(left), list2: listNode(right) }, [...left, ...right].sort((a, b) => a - b));
    });
    return {
      id: 36,
      slug: "merge-two-sorted-lists",
      title: "Merge Two Sorted Lists",
      difficulty: "Easy",
      tags: ["Linked List", "Recursion"],
      method: "mergeTwoLists",
      visible: visibleCount,
      cases,
      statement: markdown(
        "Merge Two Sorted Lists",
        "Two linked lists are already sorted in ascending order. Return one sorted list containing every node value from both lists.",
        [
          "Input: list1 = [-3,1,5], list2 = [-2,4,6]\nOutput: [-3,-2,1,4,5,6]",
          "Input: list1 = [], list2 = [0,9]\nOutput: [0,9]",
          "Input: list1 = [4], list2 = []\nOutput: [4]"
        ],
        commonListConstraints
      ),
      editorial: "Use a dummy head and repeatedly attach the smaller current node. Once one list is empty, attach the remainder of the other list.",
      solution: "```python\nclass Solution:\n    def mergeTwoLists(self, list1, list2):\n        dummy = ListNode(0)\n        tail = dummy\n        while list1 and list2:\n            if list1.val <= list2.val:\n                tail.next = list1\n                list1 = list1.next\n            else:\n                tail.next = list2\n                list2 = list2.next\n            tail = tail.next\n        tail.next = list1 or list2\n        return dummy.next\n```",
      hints: ["A dummy node avoids special handling for the first output node.", "When one list finishes, the remaining nodes are already sorted."],
      starter: "class Solution:\n    def mergeTwoLists(self, list1, list2):\n        pass"
    };
  })(),
  (() => {
    const visible = [
      caseFrom({ head: listNode([10, 20, 30, 40], { cycle_pos: 1 }) }, true),
      caseFrom({ head: listNode([5, 6, 7], { cycle_pos: -1 }) }, false),
      caseFrom({ head: listNode([1], { cycle_pos: 0 }) }, true)
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const values = valuesFromSeed(seed, 1 + (seed % 20));
      const pos = seed % 4 === 0 ? -1 : seed % values.length;
      return caseFrom({ head: listNode(values, { cycle_pos: pos }) }, pos >= 0);
    });
    return {
      id: 37,
      slug: "linked-list-cycle",
      title: "Linked List Cycle",
      difficulty: "Easy",
      tags: ["Linked List", "Two Pointers"],
      method: "hasCycle",
      visible: visibleCount,
      cases,
      statement: markdown(
        "Linked List Cycle",
        "Return whether a linked list eventually loops back to an earlier node instead of ending at `None`.",
        [
          "Input: head = [10,20,30,40], tail connects to index 1\nOutput: true",
          "Input: head = [5,6,7], tail connects to no node\nOutput: false",
          "Input: head = [1], tail connects to index 0\nOutput: true"
        ],
        commonListConstraints,
        "Solve it using constant extra memory."
      ),
      editorial: "Move one pointer by one step and another by two steps. A cycle exists exactly when the two pointers meet.",
      solution: "```python\nclass Solution:\n    def hasCycle(self, head):\n        slow = fast = head\n        while fast and fast.next:\n            slow = slow.next\n            fast = fast.next.next\n            if slow is fast:\n                return True\n        return False\n```",
      hints: ["A faster pointer can only meet a slower pointer when a loop exists.", "If the fast pointer reaches the end, the list is acyclic."],
      starter: "class Solution:\n    def hasCycle(self, head):\n        pass"
    };
  })(),
  (() => {
    const visible = [
      caseFrom({ head: listNode([10, 20, 30, 40, 50], { capture: true }) }, [10, 50, 20, 40, 30]),
      caseFrom({ head: listNode([1, 2, 3, 4], { capture: true }) }, [1, 4, 2, 3]),
      caseFrom({ head: listNode([8], { capture: true }) }, [8])
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const values = valuesFromSeed(seed, 1 + (seed % 18));
      return caseFrom({ head: listNode(values, { capture: true }) }, reorder(values));
    });
    return {
      id: 38,
      slug: "reorder-list",
      title: "Reorder List",
      difficulty: "Medium",
      tags: ["Linked List", "Two Pointers", "Stack", "Recursion"],
      method: "reorderList",
      visible: visibleCount,
      cases,
      statement: markdown(
        "Reorder List",
        "Rearrange the nodes of a linked list so values alternate from the front and back: first, last, second, second last, and so on. Modify the list in place.",
        [
          "Input: head = [10,20,30,40,50]\nOutput: [10,50,20,40,30]",
          "Input: head = [1,2,3,4]\nOutput: [1,4,2,3]",
          "Input: head = [8]\nOutput: [8]"
        ],
        commonListConstraints
      ),
      editorial: "Find the middle, reverse the second half, then weave the two halves together one node at a time.",
      solution: "```python\nclass Solution:\n    def reorderList(self, head):\n        if not head or not head.next:\n            return None\n        slow = fast = head\n        while fast.next and fast.next.next:\n            slow = slow.next\n            fast = fast.next.next\n        second = slow.next\n        slow.next = None\n        prev = None\n        while second:\n            nxt = second.next\n            second.next = prev\n            prev = second\n            second = nxt\n        first, second = head, prev\n        while second:\n            n1, n2 = first.next, second.next\n            first.next = second\n            second.next = n1\n            first, second = n1, n2\n        return None\n```",
      hints: ["The final order is easy after the second half is reversed.", "Terminate the first half before merging so no stale cycle is left behind."],
      starter: "class Solution:\n    def reorderList(self, head):\n        pass"
    };
  })(),
  (() => {
    const visible = [
      caseFrom({ head: listNode([9, 8, 7, 6]), n: 2 }, [9, 8, 6]),
      caseFrom({ head: listNode([4]), n: 1 }, []),
      caseFrom({ head: listNode([1, 2, 3]), n: 3 }, [2, 3])
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const length = 1 + (seed % 18);
      const values = valuesFromSeed(seed, length);
      const n = 1 + (seed % length);
      return caseFrom({ head: listNode(values), n }, removeNth(values, n));
    });
    return {
      id: 39,
      slug: "remove-nth-node-from-end-of-list",
      title: "Remove Nth Node From End of List",
      difficulty: "Medium",
      tags: ["Linked List", "Two Pointers"],
      method: "removeNthFromEnd",
      visible: visibleCount,
      cases,
      statement: markdown(
        "Remove Nth Node From End of List",
        "Remove the `n`th node counted from the end of a singly linked list and return the new head.",
        [
          "Input: head = [9,8,7,6], n = 2\nOutput: [9,8,6]",
          "Input: head = [4], n = 1\nOutput: []",
          "Input: head = [1,2,3], n = 3\nOutput: [2,3]"
        ],
        [...commonListConstraints, "`1 <= n <= length of the list`"]
      ),
      editorial: "Place a dummy node before the head. Move a fast pointer `n + 1` steps from the dummy, then advance both pointers until fast reaches the end.",
      solution: "```python\nclass Solution:\n    def removeNthFromEnd(self, head, n):\n        dummy = ListNode(0, head)\n        fast = slow = dummy\n        for _ in range(n + 1):\n            fast = fast.next\n        while fast:\n            fast = fast.next\n            slow = slow.next\n        slow.next = slow.next.next\n        return dummy.next\n```",
      hints: ["A dummy node handles deleting the original head.", "Keep a fixed gap between two pointers."],
      starter: "class Solution:\n    def removeNthFromEnd(self, head, n):\n        pass"
    };
  })(),
  (() => {
    const visible = [
      caseFrom({ head: randomList([[10, 2], [20, null], [30, 0]]) }, [[10, 2], [20, null], [30, 0]]),
      caseFrom({ head: randomList([[1, 1], [2, 1]]) }, [[1, 1], [2, 1]]),
      caseFrom({ head: randomList([]) }, [])
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const nodes = randomNodes(seed);
      return caseFrom({ head: randomList(nodes) }, nodes);
    });
    return {
      id: 40,
      slug: "copy-list-with-random-pointer",
      title: "Copy List with Random Pointer",
      difficulty: "Medium",
      tags: ["Hash Table", "Linked List"],
      method: "copyRandomList",
      visible: visibleCount,
      cases,
      statement: markdown(
        "Copy List with Random Pointer",
        "Each node has `next` and `random` pointers. Return the head of a newly allocated list with the same values and pointer relationships.",
        [
          "Input: nodes = [[10,2],[20,null],[30,0]]\nOutput: [[10,2],[20,null],[30,0]]",
          "Input: nodes = [[1,1],[2,1]]\nOutput: [[1,1],[2,1]]",
          "Input: nodes = []\nOutput: []"
        ],
        [
          "The judge provides a `Node` class with `val`, `next`, and `random` fields.",
          "A random pointer may be `null` or point to any node in the same list."
        ]
      ),
      editorial: "Map each original node to its clone, then wire `next` and `random` pointers using that map.",
      solution: "```python\nclass Solution:\n    def copyRandomList(self, head):\n        if not head:\n            return None\n        clones = {None: None}\n        node = head\n        while node:\n            clones[node] = Node(node.val)\n            node = node.next\n        node = head\n        while node:\n            clones[node].next = clones[node.next]\n            clones[node].random = clones[node.random]\n            node = node.next\n        return clones[head]\n```",
      hints: ["A dictionary can remember which copy belongs to each original node.", "Create all nodes before assigning random pointers."],
      starter: "class Solution:\n    def copyRandomList(self, head):\n        pass"
    };
  })(),
  (() => {
    const visible = [
      caseFrom({ l1: listNode([9, 1]), l2: listNode([1, 8]) }, [0, 0, 1]),
      caseFrom({ l1: listNode([0]), l2: listNode([0]) }, [0]),
      caseFrom({ l1: listNode([9, 9, 9]), l2: listNode([7]) }, [6, 0, 0, 1])
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const left = Array.from({ length: 1 + (seed % 12) }, (_, index) => (seed + index * 3) % 10);
      const right = Array.from({ length: 1 + ((seed * 2) % 12) }, (_, index) => (seed * 2 + index * 5) % 10);
      return caseFrom({ l1: listNode(left), l2: listNode(right) }, addDigitLists(left, right));
    });
    return {
      id: 41,
      slug: "add-two-numbers",
      title: "Add Two Numbers",
      difficulty: "Medium",
      tags: ["Linked List", "Math", "Recursion"],
      method: "addTwoNumbers",
      visible: visibleCount,
      cases,
      statement: markdown(
        "Add Two Numbers",
        "Two non-empty linked lists store non-negative integers in reverse digit order. Return a linked list representing their sum in the same digit order.",
        [
          "Input: l1 = [9,1], l2 = [1,8]\nOutput: [0,0,1]",
          "Input: l1 = [0], l2 = [0]\nOutput: [0]",
          "Input: l1 = [9,9,9], l2 = [7]\nOutput: [6,0,0,1]"
        ],
        [...commonListConstraints, "Each list contains at least one node.", "Every node value is a digit from 0 through 9."]
      ),
      editorial: "Traverse both lists while carrying a digit. Create one output node per digit until both lists and the carry are exhausted.",
      solution: "```python\nclass Solution:\n    def addTwoNumbers(self, l1, l2):\n        dummy = ListNode(0)\n        tail = dummy\n        carry = 0\n        while l1 or l2 or carry:\n            total = carry\n            if l1:\n                total += l1.val\n                l1 = l1.next\n            if l2:\n                total += l2.val\n                l2 = l2.next\n            carry, digit = divmod(total, 10)\n            tail.next = ListNode(digit)\n            tail = tail.next\n        return dummy.next\n```",
      hints: ["This is column addition from least significant digit to most significant digit.", "Do not forget the final carry."],
      starter: "class Solution:\n    def addTwoNumbers(self, l1, l2):\n        pass"
    };
  })(),
  (() => {
    const visible = [
      caseFrom({ nums: [5, 1, 4, 3, 2, 5] }, 5),
      caseFrom({ nums: [2, 4, 1, 3, 2] }, 2),
      caseFrom({ nums: [1, 1] }, 1)
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const nums = duplicateArray(seed);
      return caseFrom({ nums }, findDuplicate(nums));
    });
    return {
      id: 42,
      slug: "find-the-duplicate-number",
      title: "Find the Duplicate Number",
      difficulty: "Medium",
      tags: ["Array", "Two Pointers", "Binary Search", "Bit Manipulation"],
      method: "findDuplicate",
      visible: visibleCount,
      cases,
      statement: markdown(
        "Find the Duplicate Number",
        "An array of length `n + 1` contains integers from `1` through `n`. Exactly one value is repeated one or more times. Return that repeated value.",
        [
          "Input: nums = [5,1,4,3,2,5]\nOutput: 5",
          "Input: nums = [2,4,1,3,2]\nOutput: 2",
          "Input: nums = [1,1]\nOutput: 1"
        ],
        ["`2 <= nums.length`", "Each value is between `1` and `nums.length - 1`.", "There is exactly one duplicated value."],
        "Can you solve it without modifying the array and using constant extra space?"
      ),
      editorial: "Treat each value as a next pointer into the array. The duplicate creates a cycle, and Floyd's algorithm finds the cycle entrance.",
      solution: "```python\nclass Solution:\n    def findDuplicate(self, nums):\n        slow = fast = nums[0]\n        while True:\n            slow = nums[slow]\n            fast = nums[nums[fast]]\n            if slow == fast:\n                break\n        slow = nums[0]\n        while slow != fast:\n            slow = nums[slow]\n            fast = nums[fast]\n        return slow\n```",
      hints: ["Imagine each index pointing to the index named by its value.", "A repeated value means two pointers enter the same cycle."],
      starter: "class Solution:\n    def findDuplicate(self, nums):\n        pass"
    };
  })(),
  (() => {
    const visibleOps = [
      [["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get"], [[2], [1, 11], [2, 22], [1], [3, 33], [2], [4, 44], [1], [3]]],
      [["LRUCache", "get", "put", "get"], [[1], [7], [7, 70], [7]]],
      [["LRUCache", "put", "put", "put", "get", "get"], [[3], [1, 5], [2, 6], [3, 7], [1], [3]]]
    ];
    const visible = visibleOps.map(([operations, values]) => caseFrom({ operations, values }, lruRun(operations, values)));
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const { operations, values } = lruSeed(seed);
      return caseFrom({ operations, values }, lruRun(operations, values));
    });
    return {
      id: 43,
      slug: "lru-cache",
      title: "LRU Cache",
      difficulty: "Medium",
      tags: ["Hash Table", "Linked List", "Design", "Doubly-Linked List"],
      method: "lruCache",
      visible: visibleCount,
      cases,
      statement: markdown(
        "LRU Cache",
        "Design a fixed-capacity cache. `get(key)` returns the value for a key or `-1`. `put(key, value)` inserts or updates a key, evicting the least recently used key when capacity is exceeded. The judge calls `lruCache(operations, values)` and compares outputs from `get` calls only.",
        [
          "Input: operations = [LRUCache,put,put,get,put,get,put,get,get]\nOutput: [11,-1,-1,33]",
          "Input: operations = [LRUCache,get,put,get]\nOutput: [-1,70]",
          "Input: operations = [LRUCache,put,put,put,get,get]\nOutput: [5,7]"
        ],
        ["`1 <= capacity`", "Keys and values are integers.", "Operations are supplied as parallel arrays."]
      ),
      editorial: "A hash map provides direct key lookup, while an order-aware structure tracks recency. In Python, `OrderedDict` can move touched keys to the end.",
      solution: "```python\nfrom collections import OrderedDict\n\nclass LRUCache:\n    def __init__(self, capacity):\n        self.capacity = capacity\n        self.data = OrderedDict()\n\n    def get(self, key):\n        if key not in self.data:\n            return -1\n        self.data.move_to_end(key)\n        return self.data[key]\n\n    def put(self, key, value):\n        if key in self.data:\n            self.data.move_to_end(key)\n        self.data[key] = value\n        if len(self.data) > self.capacity:\n            self.data.popitem(last=False)\n\nclass Solution:\n    def lruCache(self, operations, values):\n        cache = None\n        out = []\n        for op, args in zip(operations, values):\n            if op == 'LRUCache':\n                cache = LRUCache(args[0])\n            elif op == 'put':\n                cache.put(*args)\n            elif op == 'get':\n                out.append(cache.get(*args))\n        return out\n```",
      hints: ["Recent keys need to move whenever they are read or written.", "When full, evict the key that has gone untouched the longest."],
      starter: "class LRUCache:\n    def __init__(self, capacity):\n        pass\n\n    def get(self, key):\n        pass\n\n    def put(self, key, value):\n        pass\n\nclass Solution:\n    def lruCache(self, operations, values):\n        pass"
    };
  })(),
  (() => {
    const visible = [
      caseFrom({ lists: [listNode([-5, 2, 9]), listNode([-4, 3]), listNode([0, 8])] }, [-5, -4, 0, 2, 3, 8, 9]),
      caseFrom({ lists: [] }, []),
      caseFrom({ lists: [listNode([]), listNode([1])] }, [1])
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const lists = listOfSortedLists(seed);
      return caseFrom(
        { lists: lists.map((values) => listNode(values)) },
        lists.flat().sort((a, b) => a - b)
      );
    });
    return {
      id: 44,
      slug: "merge-k-sorted-lists",
      title: "Merge k Sorted Lists",
      difficulty: "Hard",
      tags: ["Linked List", "Divide and Conquer", "Heap", "Merge Sort"],
      method: "mergeKLists",
      visible: visibleCount,
      cases,
      statement: markdown(
        "Merge k Sorted Lists",
        "Given an array of sorted linked-list heads, return one sorted list containing all nodes.",
        [
          "Input: lists = [[-5,2,9],[-4,3],[0,8]]\nOutput: [-5,-4,0,2,3,8,9]",
          "Input: lists = []\nOutput: []",
          "Input: lists = [[],[1]]\nOutput: [1]"
        ],
        commonListConstraints
      ),
      editorial: "Push each non-empty list head into a min-heap. Repeatedly pop the smallest node and push its successor.",
      solution: "```python\nimport heapq\n\nclass Solution:\n    def mergeKLists(self, lists):\n        heap = []\n        for index, node in enumerate(lists):\n            if node:\n                heapq.heappush(heap, (node.val, index, node))\n        dummy = ListNode(0)\n        tail = dummy\n        counter = len(lists)\n        while heap:\n            _, _, node = heapq.heappop(heap)\n            tail.next = node\n            tail = tail.next\n            if node.next:\n                counter += 1\n                heapq.heappush(heap, (node.next.val, counter, node.next))\n        return dummy.next\n```",
      hints: ["Only the current head of each list can be the next smallest node.", "A heap keeps that choice efficient."],
      starter: "class Solution:\n    def mergeKLists(self, lists):\n        pass"
    };
  })(),
  (() => {
    const visible = [
      caseFrom({ head: listNode([1, 2, 3, 4, 5, 6]), k: 3 }, [3, 2, 1, 6, 5, 4]),
      caseFrom({ head: listNode([7, 8, 9, 10, 11]), k: 2 }, [8, 7, 10, 9, 11]),
      caseFrom({ head: listNode([4, 5]), k: 3 }, [4, 5])
    ];
    const { visible: visibleCount, cases } = fillCases(visible, (seed) => {
      const values = valuesFromSeed(seed, 1 + (seed % 22));
      const k = 1 + (seed % 7);
      return caseFrom({ head: listNode(values), k }, reverseKGroup(values, k));
    });
    return {
      id: 45,
      slug: "reverse-nodes-in-k-group",
      title: "Reverse Nodes in k-Group",
      difficulty: "Hard",
      tags: ["Linked List", "Recursion"],
      method: "reverseKGroup",
      visible: visibleCount,
      cases,
      statement: markdown(
        "Reverse Nodes in k-Group",
        "Reverse the linked list in groups of exactly `k` nodes. Nodes in a final group shorter than `k` remain in their original order.",
        [
          "Input: head = [1,2,3,4,5,6], k = 3\nOutput: [3,2,1,6,5,4]",
          "Input: head = [7,8,9,10,11], k = 2\nOutput: [8,7,10,9,11]",
          "Input: head = [4,5], k = 3\nOutput: [4,5]"
        ],
        [...commonListConstraints, "`1 <= k`"]
      ),
      editorial: "Before reversing, check that a full group of `k` nodes exists. Reverse that group, connect it to the previous tail, and continue from the next group.",
      solution: "```python\nclass Solution:\n    def reverseKGroup(self, head, k):\n        dummy = ListNode(0, head)\n        group_prev = dummy\n        while True:\n            kth = group_prev\n            for _ in range(k):\n                kth = kth.next\n                if not kth:\n                    return dummy.next\n            group_next = kth.next\n            prev, current = group_next, group_prev.next\n            while current is not group_next:\n                nxt = current.next\n                current.next = prev\n                prev = current\n                current = nxt\n            new_tail = group_prev.next\n            group_prev.next = kth\n            group_prev = new_tail\n```",
      hints: ["Check group length before changing pointers.", "After a group is reversed, its old first node becomes the connector to the next group."],
      starter: "class Solution:\n    def reverseKGroup(self, head, k):\n        pass"
    };
  })()
];

for (const problem of problems) {
  writeProblem(problem);
}

console.log(`Generated ${problems.length} linked-list problem packs.`);
