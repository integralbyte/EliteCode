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
    entrypoint: { class_name: "Solution", method_name: spec.method },
    checker: spec.checker ? { type: "python", file: "checker.py" } : { type: "exact" },
    time_limit_ms: 2500, memory_limit_mb: 256,
    cases: spec.cases.map((item, index) => ({
      id: index < spec.visible ? `case-${index + 1}` : `hidden-${index + 1 - spec.visible}`,
      name: index < spec.visible ? `Case ${index + 1}` : `Hidden Case ${index + 1 - spec.visible}`,
      input: item.input, expected: item.expected, hidden: index >= spec.visible
    }))
  };
  fs.writeFileSync(path.join(dir, "problem.json"), `${JSON.stringify(problem, null, 2)}\n`);
  if (spec.checker) fs.writeFileSync(path.join(dir, "checker.py"), spec.checker.trimStart());
}

const caseFrom = (input, expected) => ({ input, expected });
function fillCases(visible, maker, target = TARGET_CASES) { const cases = [...visible]; let seed = 1; while (cases.length < target) cases.push(maker(seed++)); return { visible: visible.length, cases }; }
function markdown(title, body, examples) { return `# ${title}\n\n${body}\n\n## Examples\n\n${examples.map((e, i) => `**Example ${i + 1}**\n\n\`\`\`text\n${e}\n\`\`\``).join("\n\n")}\n\n## Constraints\n\n- Inputs are sized for local offline execution.\n- Return the value described by the method signature.`; }
const deepCopy = (v) => JSON.parse(JSON.stringify(v));

function rotateMatrix(matrix) { const n = matrix.length; for (let r = 0; r < n; r += 1) for (let c = r + 1; c < n; c += 1) [matrix[r][c], matrix[c][r]] = [matrix[c][r], matrix[r][c]]; for (const row of matrix) row.reverse(); return matrix; }
function spiral(matrix) { const out = []; let top = 0, bottom = matrix.length - 1, left = 0, right = matrix[0].length - 1; while (top <= bottom && left <= right) { for (let c = left; c <= right; c++) out.push(matrix[top][c]); top++; for (let r = top; r <= bottom; r++) out.push(matrix[r][right]); right--; if (top <= bottom) { for (let c = right; c >= left; c--) out.push(matrix[bottom][c]); bottom--; } if (left <= right) { for (let r = bottom; r >= top; r--) out.push(matrix[r][left]); left++; } } return out; }
function zeroes(matrix) { const rows = new Set(), cols = new Set(); for (let r = 0; r < matrix.length; r++) for (let c = 0; c < matrix[0].length; c++) if (matrix[r][c] === 0) { rows.add(r); cols.add(c); } for (let r = 0; r < matrix.length; r++) for (let c = 0; c < matrix[0].length; c++) if (rows.has(r) || cols.has(c)) matrix[r][c] = 0; return matrix; }
function isHappy(n) { const seen = new Set(); while (n !== 1 && !seen.has(n)) { seen.add(n); n = String(n).split("").reduce((s, ch) => s + Number(ch) ** 2, 0); } return n === 1; }
function plusOne(digits) { const out = [...digits]; for (let i = out.length - 1; i >= 0; i--) { if (out[i] < 9) { out[i]++; return out; } out[i] = 0; } out.unshift(1); return out; }
const powVal = (x, n) => Math.pow(x, n);
const multiply = (a, b) => (BigInt(a) * BigInt(b)).toString();
function detectSquaresRun(operations, values) { const points = new Map(), out = []; const key = (x, y) => `${x},${y}`; for (let i = 0; i < operations.length; i++) { const op = operations[i], args = values[i]; if (op === "DetectSquares") points.clear(); else if (op === "add") { const [x, y] = args[0]; points.set(key(x, y), (points.get(key(x, y)) ?? 0) + 1); } else if (op === "count") { const [x, y] = args[0]; let total = 0; for (const [raw, count] of points) { const [px, py] = raw.split(",").map(Number); if (Math.abs(px - x) === 0 || Math.abs(px - x) !== Math.abs(py - y)) continue; total += count * (points.get(key(px, y)) ?? 0) * (points.get(key(x, py)) ?? 0); } out.push(total); } } return out; }
function single(nums) { return nums.reduce((a, b) => a ^ b, 0); }
const bits = (n) => n.toString(2).replaceAll("0", "").length;
function countBits(n) { const out = Array(n + 1).fill(0); for (let i = 1; i <= n; i++) out[i] = out[i >> 1] + (i & 1); return out; }
function reverseBits(n) { let out = 0; for (let i = 0; i < 32; i++) { out = (out * 2) + (n & 1); n = Math.floor(n / 2); } return out >>> 0; }
function missing(nums) { return nums.length * (nums.length + 1) / 2 - nums.reduce((a, b) => a + b, 0); }
const getSum = (a, b) => a + b;
function reverseInt(x) { const sign = x < 0 ? -1 : 1; const value = sign * Number(String(Math.abs(x)).split("").reverse().join("")); return value < -2147483648 || value > 2147483647 ? 0 : value; }

const matrixSeed = (seed, square = false) => { const rows = square ? 2 + (seed % 4) : 1 + (seed % 4); const cols = square ? rows : 1 + ((seed * 2) % 5); return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => ((seed * 17 + r * 5 + c * 3) % 20) - 5)); };
const intArray = (seed, len = 4 + (seed % 8)) => Array.from({ length: len }, (_, i) => ((seed * 19 + i * 7) % 50));

const floatChecker = `
from __future__ import annotations
from typing import Any

def check(input_data: dict[str, Any], expected: float, actual: Any) -> dict[str, Any]:
    return {"passed": isinstance(actual, (int, float)) and abs(float(actual) - float(expected)) <= 1e-7, "message": ""}
`;

function makeProblem(id, slug, title, difficulty, tags, method, visible, maker, body, examples, solution, starter, checker = null) {
  const filled = fillCases(visible, maker);
  return { id, slug, title, difficulty, tags, method, visible: filled.visible, cases: filled.cases, checker,
    statement: markdown(title, body, examples), editorial: "Use direct arithmetic, matrix indexing, or bit operations to preserve the required invariants while keeping extra state small.",
    solution, hints: ["Watch fixed-width integer boundaries where the prompt requires them.", "For matrix mutation, mark or capture affected rows and columns before overwriting."], starter };
}

const problems = [
  makeProblem(136, "rotate-image", "Rotate Image", "Medium", ["Array", "Math", "Matrix"], "rotate",
    [caseFrom({ matrix: [[1,2,3],[4,5,6],[7,8,9]] }, [[7,4,1],[8,5,2],[9,6,3]]), caseFrom({ matrix: [[5]] }, [[5]]), caseFrom({ matrix: [[1,2],[3,4]] }, [[3,1],[4,2]])],
    (seed) => { const m = matrixSeed(seed, true); return caseFrom({ matrix: m }, rotateMatrix(deepCopy(m))); }, "Rotate an `n x n` matrix 90 degrees clockwise in place.", ["Input: matrix = [[1,2,3],[4,5,6],[7,8,9]]\nOutput: [[7,4,1],[8,5,2],[9,6,3]]", "Input: matrix = [[5]]\nOutput: [[5]]", "Input: matrix = [[1,2],[3,4]]\nOutput: [[3,1],[4,2]]"],
    "```python\nclass Solution:\n    def rotate(self, matrix):\n        n = len(matrix)\n        for r in range(n):\n            for c in range(r + 1, n): matrix[r][c], matrix[c][r] = matrix[c][r], matrix[r][c]\n        for row in matrix: row.reverse()\n```", "class Solution:\n    def rotate(self, matrix):\n        pass"),
  makeProblem(137, "spiral-matrix", "Spiral Matrix", "Medium", ["Array", "Matrix", "Simulation"], "spiralOrder",
    [caseFrom({ matrix: [[1,2,3],[4,5,6],[7,8,9]] }, [1,2,3,6,9,8,7,4,5]), caseFrom({ matrix: [[1,2,3,4]] }, [1,2,3,4]), caseFrom({ matrix: [[1],[2],[3]] }, [1,2,3])],
    (seed) => { const m = matrixSeed(seed); return caseFrom({ matrix: m }, spiral(m)); }, "Return all matrix values in clockwise spiral order.", ["Input: matrix = [[1,2,3],[4,5,6],[7,8,9]]\nOutput: [1,2,3,6,9,8,7,4,5]", "Input: matrix = [[1,2,3,4]]\nOutput: [1,2,3,4]", "Input: matrix = [[1],[2],[3]]\nOutput: [1,2,3]"],
    "```python\nclass Solution:\n    def spiralOrder(self, matrix):\n        out = []\n        top, bottom, left, right = 0, len(matrix) - 1, 0, len(matrix[0]) - 1\n        while top <= bottom and left <= right:\n            out += matrix[top][left:right + 1]; top += 1\n            for r in range(top, bottom + 1): out.append(matrix[r][right])\n            right -= 1\n            if top <= bottom: out += matrix[bottom][left:right + 1][::-1]; bottom -= 1\n            if left <= right:\n                for r in range(bottom, top - 1, -1): out.append(matrix[r][left])\n                left += 1\n        return out\n```", "class Solution:\n    def spiralOrder(self, matrix):\n        pass"),
  makeProblem(138, "set-matrix-zeroes", "Set Matrix Zeroes", "Medium", ["Array", "Hash Table", "Matrix"], "setZeroes",
    [caseFrom({ matrix: [[1,1,1],[1,0,1],[1,1,1]] }, [[1,0,1],[0,0,0],[1,0,1]]), caseFrom({ matrix: [[0,1,2],[3,4,5]] }, [[0,0,0],[0,4,5]]), caseFrom({ matrix: [[1]] }, [[1]])],
    (seed) => { const m = matrixSeed(seed); if (seed % 2 === 0) m[0][0] = 0; return caseFrom({ matrix: m }, zeroes(deepCopy(m))); }, "If a matrix cell is zero, set its entire row and column to zero in place.", ["Input: matrix = [[1,1,1],[1,0,1],[1,1,1]]\nOutput: [[1,0,1],[0,0,0],[1,0,1]]", "Input: matrix = [[0,1,2],[3,4,5]]\nOutput: [[0,0,0],[0,4,5]]", "Input: matrix = [[1]]\nOutput: [[1]]"],
    "```python\nclass Solution:\n    def setZeroes(self, matrix):\n        rows = {r for r, row in enumerate(matrix) for c, value in enumerate(row) if value == 0}\n        cols = {c for r, row in enumerate(matrix) for c, value in enumerate(row) if value == 0}\n        for r in range(len(matrix)):\n            for c in range(len(matrix[0])):\n                if r in rows or c in cols: matrix[r][c] = 0\n```", "class Solution:\n    def setZeroes(self, matrix):\n        pass"),
  makeProblem(139, "happy-number", "Happy Number", "Easy", ["Hash Table", "Math", "Two Pointers"], "isHappy",
    [caseFrom({ n: 19 }, true), caseFrom({ n: 2 }, false), caseFrom({ n: 1 }, true)],
    (seed) => { const n = 1 + ((seed * 37) % 500); return caseFrom({ n }, isHappy(n)); }, "Repeatedly replace a number by the sum of squares of its digits. Return whether the process reaches 1.", ["Input: n = 19\nOutput: true", "Input: n = 2\nOutput: false", "Input: n = 1\nOutput: true"],
    "```python\nclass Solution:\n    def isHappy(self, n):\n        seen = set()\n        while n != 1 and n not in seen:\n            seen.add(n)\n            n = sum(int(ch) ** 2 for ch in str(n))\n        return n == 1\n```", "class Solution:\n    def isHappy(self, n):\n        pass"),
  makeProblem(140, "plus-one", "Plus One", "Easy", ["Array", "Math"], "plusOne",
    [caseFrom({ digits: [1,2,3] }, [1,2,4]), caseFrom({ digits: [9,9] }, [1,0,0]), caseFrom({ digits: [0] }, [1])],
    (seed) => { const digits = Array.from({ length: 1 + (seed % 8) }, (_, i) => (seed + i * 3) % 10); return caseFrom({ digits }, plusOne(digits)); }, "The array stores a non-negative integer digit by digit. Return the digits after adding one.", ["Input: digits = [1,2,3]\nOutput: [1,2,4]", "Input: digits = [9,9]\nOutput: [1,0,0]", "Input: digits = [0]\nOutput: [1]"],
    "```python\nclass Solution:\n    def plusOne(self, digits):\n        for i in range(len(digits) - 1, -1, -1):\n            if digits[i] < 9:\n                digits[i] += 1; return digits\n            digits[i] = 0\n        return [1] + digits\n```", "class Solution:\n    def plusOne(self, digits):\n        pass"),
  makeProblem(141, "powx-n", "Pow(x, n)", "Medium", ["Math", "Recursion"], "myPow",
    [caseFrom({ x: 2.0, n: 10 }, 1024.0), caseFrom({ x: 2.0, n: -2 }, 0.25), caseFrom({ x: -2.0, n: 3 }, -8.0)],
    (seed) => { const x = ((seed % 7) - 3) || 2; const n = (seed % 11) - 5; return caseFrom({ x, n }, powVal(x, n)); }, "Return `x` raised to integer power `n`.", ["Input: x = 2.0, n = 10\nOutput: 1024.0", "Input: x = 2.0, n = -2\nOutput: 0.25", "Input: x = -2.0, n = 3\nOutput: -8.0"],
    "```python\nclass Solution:\n    def myPow(self, x, n):\n        if n < 0:\n            x, n = 1 / x, -n\n        result = 1.0\n        while n:\n            if n & 1: result *= x\n            x *= x; n >>= 1\n        return result\n```", "class Solution:\n    def myPow(self, x, n):\n        pass", floatChecker),
  makeProblem(142, "multiply-strings", "Multiply Strings", "Medium", ["Math", "String", "Simulation"], "multiply",
    [caseFrom({ num1: "123", num2: "456" }, "56088"), caseFrom({ num1: "0", num2: "999" }, "0"), caseFrom({ num1: "12", num2: "12" }, "144")],
    (seed) => { const a = String(1 + ((seed * 12345) % 99999)); const b = String(1 + ((seed * 54321) % 99999)); return caseFrom({ num1: a, num2: b }, multiply(a, b)); }, "Multiply two non-negative integers represented as decimal strings and return the product string.", ["Input: num1 = 123, num2 = 456\nOutput: 56088", "Input: num1 = 0, num2 = 999\nOutput: 0", "Input: num1 = 12, num2 = 12\nOutput: 144"],
    "```python\nclass Solution:\n    def multiply(self, num1, num2):\n        if num1 == '0' or num2 == '0': return '0'\n        out = [0] * (len(num1) + len(num2))\n        for i in range(len(num1) - 1, -1, -1):\n            for j in range(len(num2) - 1, -1, -1):\n                product = int(num1[i]) * int(num2[j]) + out[i + j + 1]\n                out[i + j + 1] = product % 10\n                out[i + j] += product // 10\n        return ''.join(map(str, out)).lstrip('0')\n```", "class Solution:\n    def multiply(self, num1, num2):\n        pass"),
  makeProblem(143, "detect-squares", "Detect Squares", "Medium", ["Array", "Hash Table", "Design", "Counting"], "detectSquares",
    [caseFrom({ operations: ["DetectSquares","add","add","add","count","add","count"], values: [[], [[3,10]], [[11,2]], [[3,2]], [[11,10]], [[11,2]], [[11,10]]] }, [1,2]), caseFrom({ operations: ["DetectSquares","add","count"], values: [[], [[1,1]], [[1,1]]] }, [0]), caseFrom({ operations: ["DetectSquares","add","add","count"], values: [[], [[0,0]], [[1,1]], [[0,1]]] }, [0])],
    (seed) => { const operations = ["DetectSquares"], values = [[]]; for (let i = 0; i < 8 + (seed % 6); i++) { operations.push("add"); values.push([[(seed + i) % 6, (seed * 2 + i * 3) % 6]]); if (i % 3 === 0) { operations.push("count"); values.push([[(seed + i + 1) % 6, (seed + i + 2) % 6]]); } } return caseFrom({ operations, values }, detectSquaresRun(operations, values)); }, "Design a structure that adds points and counts axis-aligned squares using a query point. The judge calls `detectSquares(operations, values)` and compares outputs from `count`.", ["Input: add [3,10], add [11,2], add [3,2], count [11,10], add [11,2], count [11,10]\nOutput: [1,2]", "Input: add [1,1], count [1,1]\nOutput: [0]", "Input: add [0,0], add [1,1], count [0,1]\nOutput: [0]"],
    "```python\nfrom collections import Counter\n\nclass DetectSquares:\n    def __init__(self):\n        self.points = Counter()\n\n    def add(self, point):\n        self.points[tuple(point)] += 1\n\n    def count(self, point):\n        x, y = point\n        total = 0\n        for (px, py), count in self.points.items():\n            if px == x or abs(px - x) != abs(py - y): continue\n            total += count * self.points[(px, y)] * self.points[(x, py)]\n        return total\n\nclass Solution:\n    def detectSquares(self, operations, values):\n        obj = None; out = []\n        for op, args in zip(operations, values):\n            if op == 'DetectSquares': obj = DetectSquares()\n            elif op == 'add': obj.add(args[0])\n            elif op == 'count': out.append(obj.count(args[0]))\n        return out\n```", "class DetectSquares:\n    def __init__(self):\n        pass\n\n    def add(self, point):\n        pass\n\n    def count(self, point):\n        pass\n\nclass Solution:\n    def detectSquares(self, operations, values):\n        pass"),
  makeProblem(144, "single-number", "Single Number", "Easy", ["Array", "Bit Manipulation"], "singleNumber",
    [caseFrom({ nums: [2,2,1] }, 1), caseFrom({ nums: [4,1,2,1,2] }, 4), caseFrom({ nums: [-1] }, -1)],
    (seed) => { const base = intArray(seed, 4).slice(0, 4); const unique = seed * 7 + 101; const arr = base.flatMap((x) => [x, x]); arr.splice(seed % (arr.length + 1), 0, unique); return caseFrom({ nums: arr }, single(arr)); }, "Every value appears twice except one. Return the single value.", ["Input: nums = [2,2,1]\nOutput: 1", "Input: nums = [4,1,2,1,2]\nOutput: 4", "Input: nums = [-1]\nOutput: -1"],
    "```python\nclass Solution:\n    def singleNumber(self, nums):\n        out = 0\n        for value in nums: out ^= value\n        return out\n```", "class Solution:\n    def singleNumber(self, nums):\n        pass"),
  makeProblem(145, "number-of-1-bits", "Number of 1 Bits", "Easy", ["Divide and Conquer", "Bit Manipulation"], "hammingWeight",
    [caseFrom({ n: 11 }, 3), caseFrom({ n: 128 }, 1), caseFrom({ n: 4294967293 }, 31)],
    (seed) => { const n = (seed * 2654435761) >>> 0; return caseFrom({ n }, bits(n)); }, "Return how many `1` bits appear in the unsigned 32-bit representation of `n`.", ["Input: n = 11\nOutput: 3", "Input: n = 128\nOutput: 1", "Input: n = 4294967293\nOutput: 31"],
    "```python\nclass Solution:\n    def hammingWeight(self, n):\n        count = 0\n        while n:\n            n &= n - 1; count += 1\n        return count\n```", "class Solution:\n    def hammingWeight(self, n):\n        pass"),
  makeProblem(146, "counting-bits", "Counting Bits", "Easy", ["Dynamic Programming", "Bit Manipulation"], "countBits",
    [caseFrom({ n: 2 }, [0,1,1]), caseFrom({ n: 5 }, [0,1,1,2,1,2]), caseFrom({ n: 0 }, [0])],
    (seed) => { const n = seed % 80; return caseFrom({ n }, countBits(n)); }, "Return an array where index `i` contains the number of set bits in `i` for every `0 <= i <= n`.", ["Input: n = 2\nOutput: [0,1,1]", "Input: n = 5\nOutput: [0,1,1,2,1,2]", "Input: n = 0\nOutput: [0]"],
    "```python\nclass Solution:\n    def countBits(self, n):\n        out = [0] * (n + 1)\n        for i in range(1, n + 1): out[i] = out[i >> 1] + (i & 1)\n        return out\n```", "class Solution:\n    def countBits(self, n):\n        pass"),
  makeProblem(147, "reverse-bits", "Reverse Bits", "Easy", ["Divide and Conquer", "Bit Manipulation"], "reverseBits",
    [caseFrom({ n: 43261596 }, 964176192), caseFrom({ n: 0 }, 0), caseFrom({ n: 1 }, 2147483648)],
    (seed) => { const n = (seed * 1103515245) >>> 0; return caseFrom({ n }, reverseBits(n)); }, "Reverse the bit order of an unsigned 32-bit integer.", ["Input: n = 43261596\nOutput: 964176192", "Input: n = 0\nOutput: 0", "Input: n = 1\nOutput: 2147483648"],
    "```python\nclass Solution:\n    def reverseBits(self, n):\n        out = 0\n        for _ in range(32):\n            out = (out << 1) | (n & 1)\n            n >>= 1\n        return out\n```", "class Solution:\n    def reverseBits(self, n):\n        pass"),
  makeProblem(148, "missing-number", "Missing Number", "Easy", ["Array", "Hash Table", "Math", "Binary Search", "Bit Manipulation", "Sorting"], "missingNumber",
    [caseFrom({ nums: [3,0,1] }, 2), caseFrom({ nums: [0,1] }, 2), caseFrom({ nums: [9,6,4,2,3,5,7,0,1] }, 8)],
    (seed) => { const n = 1 + (seed % 30); const miss = seed % (n + 1); const arr = Array.from({ length: n + 1 }, (_, i) => i).filter((x) => x !== miss); return caseFrom({ nums: arr }, missing(arr)); }, "An array contains `n` distinct numbers from `0` through `n` with one missing. Return the missing number.", ["Input: nums = [3,0,1]\nOutput: 2", "Input: nums = [0,1]\nOutput: 2", "Input: nums = [9,6,4,2,3,5,7,0,1]\nOutput: 8"],
    "```python\nclass Solution:\n    def missingNumber(self, nums):\n        return len(nums) * (len(nums) + 1) // 2 - sum(nums)\n```", "class Solution:\n    def missingNumber(self, nums):\n        pass"),
  makeProblem(149, "sum-of-two-integers", "Sum of Two Integers", "Medium", ["Math", "Bit Manipulation"], "getSum",
    [caseFrom({ a: 1, b: 2 }, 3), caseFrom({ a: -2, b: 3 }, 1), caseFrom({ a: -5, b: -7 }, -12)],
    (seed) => { const a = ((seed * 17) % 100) - 50, b = ((seed * 31) % 100) - 50; return caseFrom({ a, b }, getSum(a, b)); }, "Return the sum of two integers without using `+` or `-` in the core algorithm.", ["Input: a = 1, b = 2\nOutput: 3", "Input: a = -2, b = 3\nOutput: 1", "Input: a = -5, b = -7\nOutput: -12"],
    "```python\nclass Solution:\n    def getSum(self, a, b):\n        mask = 0xffffffff\n        while b & mask:\n            a, b = (a ^ b) & mask, ((a & b) << 1) & mask\n        return a if a <= 0x7fffffff else ~(a ^ mask)\n```", "class Solution:\n    def getSum(self, a, b):\n        pass"),
  makeProblem(150, "reverse-integer", "Reverse Integer", "Medium", ["Math"], "reverse",
    [caseFrom({ x: 123 }, 321), caseFrom({ x: -120 }, -21), caseFrom({ x: 1534236469 }, 0)],
    (seed) => { const x = ((seed * 9876543) % 3000000000) - 1500000000; return caseFrom({ x }, reverseInt(x)); }, "Reverse the decimal digits of a signed 32-bit integer. Return `0` if the reversed value overflows the signed 32-bit range.", ["Input: x = 123\nOutput: 321", "Input: x = -120\nOutput: -21", "Input: x = 1534236469\nOutput: 0"],
    "```python\nclass Solution:\n    def reverse(self, x):\n        sign = -1 if x < 0 else 1\n        value = int(str(abs(x))[::-1]) * sign\n        return value if -2 ** 31 <= value <= 2 ** 31 - 1 else 0\n```", "class Solution:\n    def reverse(self, x):\n        pass")
];

for (const problem of problems) writeProblem(problem);
console.log(`Generated ${problems.length} math/bit problem packs.`);
