const PYODIDE_INDEX_URL = "https://cdn.jsdelivr.net/pyodide/v0.29.4/full/";

let pyodidePromise = null;

const RUNNER_SOURCE = String.raw`
import builtins
import contextlib
import copy
import importlib
import io
import json
import sys
import time
import traceback
from pathlib import Path
from typing import List, Optional


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


class Node:
    def __init__(self, val=0, next=None, random=None, neighbors=None):
        self.val = val
        if isinstance(next, list) and random is None and neighbors is None:
            self.next = None
            self.random = None
            self.neighbors = next
        else:
            self.next = next
            self.random = random
            self.neighbors = [] if neighbors is None else neighbors


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


builtins.ListNode = ListNode
builtins.Node = Node
builtins.TreeNode = TreeNode
builtins.Optional = Optional
builtins.List = List


def build_list_node(values, cycle_pos=-1):
    if not values:
        return None
    nodes = [ListNode(value) for value in values]
    for left, right in zip(nodes, nodes[1:]):
        left.next = right
    if isinstance(cycle_pos, int) and 0 <= cycle_pos < len(nodes):
        nodes[-1].next = nodes[cycle_pos]
    return nodes[0]


def list_node_to_array(head, limit=10000):
    values = []
    seen = {}
    node = head
    while node is not None and len(values) < limit:
        node_id = id(node)
        if node_id in seen:
            return {"values": values, "cycle_pos": seen[node_id]}
        seen[node_id] = len(values)
        values.append(node.val)
        node = node.next
    if node is not None:
        return {"values": values, "truncated": True}
    return values


def build_random_list(items):
    if not items:
        return None
    nodes = [Node(value) for value, _ in items]
    for index, node in enumerate(nodes[:-1]):
        node.next = nodes[index + 1]
    for index, (_, random_index) in enumerate(items):
        if random_index is not None:
            nodes[index].random = nodes[random_index]
    return nodes[0]


def build_graph_node(adj_list):
    if not adj_list:
        return None
    nodes = [Node(index + 1, []) for index in range(len(adj_list))]
    for index, neighbors in enumerate(adj_list):
        nodes[index].neighbors = [nodes[value - 1] for value in neighbors]
    return nodes[0]


def graph_node_to_adj(node, limit=10000):
    if node is None:
        return []
    nodes = []
    seen = {id(node): 0}
    queue = [node]
    while queue and len(nodes) < limit:
        current = queue.pop(0)
        nodes.append(current)
        for neighbor in getattr(current, "neighbors", []) or []:
            if id(neighbor) not in seen:
                seen[id(neighbor)] = len(seen)
                queue.append(neighbor)
    if all(isinstance(getattr(current, "val", None), int) and current.val > 0 for current in nodes):
        out = [[] for _ in range(max(current.val for current in nodes))]
        for current in nodes:
            out[current.val - 1] = [neighbor.val for neighbor in getattr(current, "neighbors", []) or []]
        return out

    out = [[] for _ in nodes]
    for current in nodes:
        current_index = seen[id(current)]
        out[current_index] = [seen[id(neighbor)] + 1 for neighbor in getattr(current, "neighbors", []) or []]
    return out


def random_list_to_array(head, limit=10000):
    nodes = []
    index_by_id = {}
    node = head
    while node is not None and len(nodes) < limit:
        node_id = id(node)
        if node_id in index_by_id:
            break
        index_by_id[node_id] = len(nodes)
        nodes.append(node)
        node = node.next
    out = []
    for node in nodes:
        random_index = None if node.random is None else index_by_id.get(id(node.random))
        out.append([node.val, random_index])
    return out


def build_tree_node(values):
    if not values:
        return None
    nodes = [None if value is None else TreeNode(value) for value in values]
    child_index = 1
    for node in nodes:
        if node is None:
            continue
        if child_index < len(nodes):
            node.left = nodes[child_index]
            child_index += 1
        if child_index < len(nodes):
            node.right = nodes[child_index]
            child_index += 1
    return nodes[0]


def index_tree_nodes(root, context):
    if root is None:
        return
    queue = [root]
    by_value = context.setdefault("tree_nodes_by_value", {})
    while queue:
        node = queue.pop(0)
        if node is None:
            continue
        by_value.setdefault(node.val, node)
        queue.append(node.left)
        queue.append(node.right)


def tree_node_to_array(root, limit=10000):
    if root is None:
        return []
    out = []
    queue = [root]
    while queue and len(out) < limit:
        node = queue.pop(0)
        if node is None:
            out.append(None)
            continue
        out.append(node.val)
        queue.append(node.left)
        queue.append(node.right)
    while out and out[-1] is None:
        out.pop()
    return out


def decode_value(value, captures, context):
    if isinstance(value, dict):
        marker = value.get("__elite_type")
        if marker == "list_node":
            node = build_list_node(value.get("values", []), value.get("cycle_pos", -1))
            if value.get("capture"):
                captures.append(node)
            return node
        if marker == "random_list":
            node = build_random_list(value.get("nodes", []))
            if value.get("capture"):
                captures.append(node)
            return node
        if marker == "graph_node":
            node = build_graph_node(value.get("adjacency", []))
            if value.get("capture"):
                captures.append(node)
            return node
        if marker == "tree_node":
            node = build_tree_node(value.get("values", []))
            index_tree_nodes(node, context)
            if value.get("capture"):
                captures.append(node)
            return node
        if marker == "tree_ref":
            return context.get("tree_nodes_by_value", {}).get(value.get("value"))
        return {key: decode_value(item, captures, context) for key, item in value.items()}
    if isinstance(value, list):
        return [decode_value(item, captures, context) for item in value]
    return value


def has_structured_marker(value):
    if isinstance(value, dict):
        marker = value.get("__elite_type")
        if marker in {"list_node", "random_list", "tree_node", "graph_node"}:
            return True
        return any(has_structured_marker(item) for item in value.values())
    if isinstance(value, list):
        return any(has_structured_marker(item) for item in value)
    return False


STRUCTURED_EMPTY_METHODS = {
    "reverseList",
    "mergeTwoLists",
    "removeNthFromEnd",
    "copyRandomList",
    "addTwoNumbers",
    "mergeKLists",
    "reverseKGroup",
    "cloneGraph",
}


VALUE_NODE_METHODS = {"lowestCommonAncestor"}
GRAPH_NODE_METHODS = {"cloneGraph"}
MUTATING_FIRST_ARG_METHODS = {"wallsAndGates", "solve", "rotate", "setZeroes"}


def encode_value(value):
    if isinstance(value, ListNode):
        return list_node_to_array(value)
    if isinstance(value, TreeNode):
        return tree_node_to_array(value)
    if isinstance(value, Node):
        if hasattr(value, "random") or hasattr(value, "next"):
            return random_list_to_array(value)
    if isinstance(value, list):
        return [encode_value(item) for item in value]
    if isinstance(value, tuple):
        return [encode_value(item) for item in value]
    if isinstance(value, dict):
        return {key: encode_value(item) for key, item in value.items()}
    return value


def jsonable(value):
    value = encode_value(value)
    try:
        json.dumps(value)
        return value
    except TypeError:
        return {"__non_json_return__": repr(value)}


def main():
    payload = json.loads(Path("payload.json").read_text(encoding="utf-8"))
    cases = payload["cases"]
    entrypoint = payload["entrypoint"]
    import_stdout = io.StringIO()
    import_stderr = io.StringIO()
    try:
        with contextlib.redirect_stdout(import_stdout), contextlib.redirect_stderr(import_stderr):
            sys.modules.pop("solution", None)
            solution_module = importlib.import_module("solution")
            solution_class = getattr(solution_module, entrypoint["class_name"])
    except Exception:
        message = traceback.format_exc()
        print(json.dumps({
            "import_error": message,
            "import_stdout": import_stdout.getvalue(),
            "import_stderr": import_stderr.getvalue(),
            "results": []
        }))
        return

    results = []
    for case in cases:
        stdout = io.StringIO()
        stderr = io.StringIO()
        started = time.perf_counter()
        try:
            with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                instance = solution_class()
                method = getattr(instance, entrypoint["method_name"])
                captures = []
                context = {}
                input_data = decode_value(copy.deepcopy(case["input"]), captures, context)
                if isinstance(input_data, dict):
                    actual = method(**input_data)
                elif isinstance(input_data, list):
                    actual = method(*input_data)
                else:
                    actual = method(input_data)
                if isinstance(actual, Node) and entrypoint.get("method_name") in GRAPH_NODE_METHODS:
                    actual = graph_node_to_adj(actual)
                if isinstance(actual, TreeNode) and entrypoint.get("method_name") in VALUE_NODE_METHODS:
                    actual = actual.val
                if actual is None and captures:
                    actual = captures[0]
                if actual is None and entrypoint.get("method_name") in MUTATING_FIRST_ARG_METHODS:
                    if isinstance(input_data, dict) and input_data:
                        actual = next(iter(input_data.values()))
                    else:
                        actual = input_data
                if (
                    actual is None
                    and case.get("expected") == []
                    and (
                        has_structured_marker(case.get("input"))
                        or entrypoint.get("method_name") in STRUCTURED_EMPTY_METHODS
                    )
                ):
                    actual = []
            elapsed_ms = round((time.perf_counter() - started) * 1000, 3)
            results.append({
                "case_id": case["id"],
                "actual": jsonable(actual),
                "stdout": stdout.getvalue(),
                "stderr": stderr.getvalue(),
                "runtime_ms": elapsed_ms,
                "error": None
            })
        except Exception:
            elapsed_ms = round((time.perf_counter() - started) * 1000, 3)
            results.append({
                "case_id": case["id"],
                "actual": None,
                "stdout": stdout.getvalue(),
                "stderr": stderr.getvalue(),
                "runtime_ms": elapsed_ms,
                "error": traceback.format_exc()
            })

    print(json.dumps({"results": results, "import_stdout": import_stdout.getvalue(), "import_stderr": import_stderr.getvalue()}))


if __name__ == "__main__":
    main()
`;

async function getPyodide() {
  if (!pyodidePromise) {
    importScripts(`${PYODIDE_INDEX_URL}pyodide.js`);
    pyodidePromise = loadPyodide({ indexURL: PYODIDE_INDEX_URL });
  }
  return pyodidePromise;
}

self.onmessage = async (event) => {
  const { id, code, payload } = event.data;
  try {
    const pyodide = await getPyodide();
    pyodide.FS.writeFile("/home/pyodide/solution.py", code);
    pyodide.FS.writeFile("/home/pyodide/runner.py", RUNNER_SOURCE);
    pyodide.FS.writeFile("/home/pyodide/payload.json", JSON.stringify(payload));

    const output = await pyodide.runPythonAsync(String.raw`
import contextlib
import io
import os
import runpy
import sys

os.chdir("/home/pyodide")
if "/home/pyodide" not in sys.path:
    sys.path.insert(0, "/home/pyodide")
sys.modules.pop("solution", None)
buffer = io.StringIO()
with contextlib.redirect_stdout(buffer):
    runpy.run_path("runner.py", run_name="__main__")
buffer.getvalue()
`);
    self.postMessage({ id, ok: true, payload: JSON.parse(output || "{}") });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
