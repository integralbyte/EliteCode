import fs from "node:fs/promises";
import path from "node:path";

const problemsRoot = path.resolve(import.meta.dirname, "..", "problems");
const minCases = Number(process.env.ELITECODE_MIN_CASES ?? 2000);
const minUnique = Number(process.env.ELITECODE_MIN_UNIQUE_NONFINITE ?? 1000);
const minFeatureFamilies = Number(process.env.ELITECODE_MIN_EDGE_FEATURES ?? 11);
const minBooleanClassCases = Number(process.env.ELITECODE_MIN_BOOLEAN_CLASS_CASES ?? 500);
const minNumericExpectedValues = Number(process.env.ELITECODE_MIN_NUMERIC_EXPECTED_VALUES ?? 15);
const minArrayExpectedValues = Number(process.env.ELITECODE_MIN_ARRAY_EXPECTED_VALUES ?? 50);
const minStringExpectedValues = Number(process.env.ELITECODE_MIN_STRING_EXPECTED_VALUES ?? 1000);
const minCompositeInputSizes = Number(process.env.ELITECODE_MIN_COMPOSITE_INPUT_SIZES ?? 11);
const minCompositeMaxInputSize = Number(process.env.ELITECODE_MIN_COMPOSITE_MAX_INPUT_SIZE ?? 20);

const finiteDomains = {
  "generate-parentheses": { field: "n", values: range(1, 8) },
  "n-queens": { field: "n", values: range(1, 8) },
  "climbing-stairs": { field: "n", values: range(1, 75) }
};

const compactInputDomains = new Set([
  "cheapest-flights-within-k-stops",
  "climbing-stairs",
  "counting-bits",
  "burst-balloons",
  "generate-parentheses",
  "happy-number",
  "k-closest-points-to-origin",
  "letter-combinations-of-a-phone-number",
  "longest-increasing-path-in-a-matrix",
  "lowest-common-ancestor-of-a-binary-search-tree",
  "multiply-strings",
  "n-queens",
  "number-of-1-bits",
  "palindrome-partitioning",
  "permutations",
  "powx-n",
  "reconstruct-itinerary",
  "reverse-bits",
  "reverse-integer",
  "rotate-image",
  "single-number",
  "subsets",
  "subsets-ii",
  "sum-of-two-integers",
  "swim-in-rising-water",
  "unique-paths",
  "valid-sudoku"
]);

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function inputSize(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "string") return value.length;
  if (typeof value === "number" || typeof value === "boolean") return 1;
  if (Array.isArray(value)) return value.length + value.reduce((sum, item) => sum + inputSize(item), 0);
  if (isPlainObject(value)) {
    if (value.__elite_type === "tree_node" && Array.isArray(value.values)) return value.values.filter((item) => item !== null).length;
    if (value.__elite_type === "list_node" && Array.isArray(value.values)) return value.values.length;
    if (value.__elite_type === "random_list" && Array.isArray(value.nodes)) return value.nodes.length;
    if (value.__elite_type === "graph_node" && Array.isArray(value.adjacency)) {
      return value.adjacency.length + value.adjacency.reduce((sum, row) => sum + (Array.isArray(row) ? row.length : 0), 0);
    }
    return Object.values(value).reduce((sum, item) => sum + inputSize(item), 0);
  }
  return 1;
}

function isNumberArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isMatrix(value) {
  return Array.isArray(value) && value.length > 0 && value.every((row) => Array.isArray(row));
}

function hasDuplicate(values) {
  return new Set(values).size < values.length;
}

function hasStringPrefixPair(values) {
  for (let i = 0; i < values.length; i += 1) {
    for (let j = 0; j < values.length; j += 1) {
      if (i !== j && values[i].length > values[j].length && values[i].startsWith(values[j])) return true;
    }
  }
  return false;
}

function hasMatrixColumnDuplicate(matrix) {
  const cols = Math.max(...matrix.map((row) => row.length));
  for (let c = 0; c < cols; c += 1) {
    const values = matrix.map((row) => row[c]).filter((item) => item !== undefined && item !== ".");
    if (hasDuplicate(values)) return true;
  }
  return false;
}

function hasSudokuBoxDuplicate(matrix) {
  if (matrix.length !== 9 || matrix.some((row) => row.length !== 9)) return false;
  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      const values = [];
      for (let r = br; r < br + 3; r += 1) {
        for (let c = bc; c < bc + 3; c += 1) {
          if (matrix[r][c] !== ".") values.push(matrix[r][c]);
        }
      }
      if (hasDuplicate(values)) return true;
    }
  }
  return false;
}

function addScalarFeatures(features, value, prefix) {
  if (typeof value === "number") {
    if (value === 0) features.add(`${prefix}:zero`);
    if (value === 1) features.add(`${prefix}:one`);
    if (value < 0) features.add(`${prefix}:negative`);
    if (value > 0) features.add(`${prefix}:positive`);
    if (Number.isInteger(value)) features.add(`${prefix}:integer`);
    if (Number.isInteger(value) && value % 2 === 0) features.add(`${prefix}:even-number`);
    if (Number.isInteger(value) && Math.abs(value % 2) === 1) features.add(`${prefix}:odd-number`);
    if (Number.isInteger(value) && value > 0 && Number.isInteger(Math.log2(value))) features.add(`${prefix}:power-of-two`);
    if (Math.abs(value) <= 1) features.add(`${prefix}:small-number`);
    if (Math.abs(value) >= 50) features.add(`${prefix}:largeish-number`);
    if (Math.abs(value) >= 1000) features.add(`${prefix}:large-number`);
    if (Number.isInteger(value) && value >= 0xffffffff - 1024) features.add(`${prefix}:near-uint32-limit`);
  } else if (typeof value === "boolean") {
    features.add(`${prefix}:boolean-${value}`);
  } else if (typeof value === "string") {
    if (value.length === 0) features.add(`${prefix}:empty-string`);
    if (value.length === 1) features.add(`${prefix}:single-char`);
    if (value.length >= 10) features.add(`${prefix}:long-string`);
    if (value === [...value].reverse().join("") && value.length > 1) features.add(`${prefix}:palindrome-string`);
    if (/[^a-zA-Z0-9]/.test(value)) features.add(`${prefix}:punctuation`);
    if (new Set(value).size < value.length) features.add(`${prefix}:repeated-chars`);
    if (value.length > 1 && new Set(value).size === 1) features.add(`${prefix}:all-same-string`);
    if (value.length >= 4 && new Set(value).size === value.length) features.add(`${prefix}:all-distinct-string`);
    if (value.length >= 4 && value.split("").every((ch, index) => ch === value[index % 2])) features.add(`${prefix}:alternating-string`);
    if (/^[a-z]+$/.test(value)) features.add(`${prefix}:lowercase-string`);
    if (/^[A-Z]+$/.test(value)) features.add(`${prefix}:uppercase-string`);
    if (/^[0-9]+$/.test(value)) features.add(`${prefix}:digit-string`);
    if (/^[()[\]{}*]+$/.test(value)) features.add(`${prefix}:delimiter-string`);
  }
}

function collectFeatures(value, features, prefix = "input") {
  addScalarFeatures(features, value, prefix);

  if (isNumberArray(value)) {
    if (value.length === 0) features.add(`${prefix}:empty-array`);
    if (value.length === 1) features.add(`${prefix}:single-element-array`);
    if (value.length >= 10) features.add(`${prefix}:long-array`);
    if (value.includes(0)) features.add(`${prefix}:contains-zero`);
    if (value.some((item) => item < 0)) features.add(`${prefix}:contains-negative`);
    if (value.some((item) => item > 0)) features.add(`${prefix}:contains-positive`);
    if (value.length > 0 && value.every((item) => item === 0)) features.add(`${prefix}:all-zero`);
    if (value.length > 0 && value.every((item) => item > 0)) features.add(`${prefix}:all-positive`);
    if (value.length > 0 && value.every((item) => item >= 0)) features.add(`${prefix}:all-nonnegative`);
    if (value.length > 0 && value.every((item) => item <= 0)) features.add(`${prefix}:all-nonpositive`);
    if (value.some((item) => Math.abs(item) >= 50)) features.add(`${prefix}:contains-largeish`);
    if (value.some((item) => Math.abs(item) >= 1000)) features.add(`${prefix}:contains-large`);
    if (new Set(value).size < value.length) features.add(`${prefix}:duplicates`);
    if (value.length > 0 && new Set(value).size === value.length) features.add(`${prefix}:all-distinct`);
    if (value.length > 1 && value.every((item) => item === value[0])) features.add(`${prefix}:uniform-values`);
    if (value.some((item, index) => index > 0 && item === value[index - 1])) features.add(`${prefix}:adjacent-duplicate`);
    if (value.every((item, index) => index === 0 || value[index - 1] <= item)) features.add(`${prefix}:sorted`);
    if (value.every((item, index) => index === 0 || value[index - 1] >= item)) features.add(`${prefix}:reverse-sorted`);
  } else if (isStringArray(value)) {
    features.add(`${prefix}:string-array`);
    if (value.length === 0) features.add(`${prefix}:empty-array`);
    if (value.length === 1) features.add(`${prefix}:single-element-array`);
    if (value.length >= 10) features.add(`${prefix}:long-array`);
    if (value.includes("")) features.add(`${prefix}:contains-empty-string`);
    if (hasDuplicate(value)) features.add(`${prefix}:duplicates`);
    if (hasStringPrefixPair(value)) features.add(`${prefix}:prefix-pair`);
    if (new Set(value.map((item) => item.length)).size > 1) features.add(`${prefix}:mixed-string-lengths`);
    if (value.every((item, index) => index === 0 || value[index - 1] <= item)) features.add(`${prefix}:lexicographically-sorted`);
    for (const item of value.slice(0, 40)) collectFeatures(item, features, prefix);
  } else if (Array.isArray(value)) {
    if (value.length === 0) features.add(`${prefix}:empty-array`);
    if (value.length === 1) features.add(`${prefix}:single-element-array`);
    if (value.length >= 10) features.add(`${prefix}:long-array`);
    if (isMatrix(value)) {
      const rows = value.length;
      const cols = Math.max(...value.map((row) => row.length));
      features.add(`${prefix}:matrix`);
      if (rows === 1 && cols === 1) features.add(`${prefix}:single-cell-matrix`);
      if (rows === 1) features.add(`${prefix}:one-row-matrix`);
      if (cols === 1) features.add(`${prefix}:one-column-matrix`);
      if (rows === cols) features.add(`${prefix}:square-matrix`);
      if (rows !== cols) features.add(`${prefix}:rectangular-matrix`);
      if (value.every((row) => row.every((item) => typeof item === "string"))) {
        features.add(`${prefix}:string-matrix`);
        if (value.some((row) => row.includes("."))) features.add(`${prefix}:contains-placeholder`);
        if (value.some((row) => hasDuplicate(row.filter((item) => item !== ".")))) features.add(`${prefix}:row-duplicate`);
        if (hasMatrixColumnDuplicate(value)) features.add(`${prefix}:column-duplicate`);
        if (hasSudokuBoxDuplicate(value)) features.add(`${prefix}:box-duplicate`);
      }
      if (value.every((row) => row.every((item) => typeof item === "number"))) {
        features.add(`${prefix}:number-matrix`);
        if (value.every((row) => row.every((item) => item === 0 || item === 1))) features.add(`${prefix}:binary-matrix`);
        if (value.flat().includes(0)) features.add(`${prefix}:matrix-contains-zero`);
      }
    }
    for (const item of value.slice(0, 40)) collectFeatures(item, features, prefix);
  } else if (isPlainObject(value)) {
    if (value.__elite_type === "list_node" && Array.isArray(value.values)) {
      features.add(`${prefix}:linked-list`);
      collectFeatures(value.values, features, `${prefix}:list-values`);
    } else if (value.__elite_type === "tree_node") {
      features.add(`${prefix}:tree`);
      collectFeatures(value.values, features, `${prefix}:tree-values`);
    } else if (value.__elite_type === "graph_node") {
      features.add(`${prefix}:graph`);
      collectFeatures(value.adjacency, features, `${prefix}:graph-adjacency`);
    } else if (value.__elite_type === "random_list") {
      features.add(`${prefix}:random-list`);
      collectFeatures(value.nodes, features, `${prefix}:random-list-nodes`);
    } else {
      for (const [key, child] of Object.entries(value)) collectFeatures(child, features, `${prefix}:${key}`);
    }
  }
}

function finiteDomainFailures(problem, uniqueInputs) {
  const domain = finiteDomains[problem.slug];
  if (!domain) return [];
  const present = new Set(problem.cases.map((item) => item.input?.[domain.field]));
  return domain.values
    .filter((value) => !present.has(value))
    .map((value) => `${problem.slug} missing ${domain.field}=${value}`);
}

const failures = [];
const rows = [];

for (const dir of await fs.readdir(problemsRoot)) {
  const file = path.join(problemsRoot, dir, "problem.json");
  try {
    const problem = JSON.parse(await fs.readFile(file, "utf8"));
    const uniqueInputs = new Set(problem.cases.map((item) => JSON.stringify(item.input)));
    const features = new Set();
    for (const item of problem.cases) {
      collectFeatures(item.input, features, "input");
      collectFeatures(item.expected, features, "expected");
    }

    const finiteFailures = finiteDomainFailures(problem, uniqueInputs);
    failures.push(...finiteFailures);

    if (problem.cases.length < minCases) failures.push(`${problem.slug} has ${problem.cases.length} cases, expected at least ${minCases}`);
    if (!finiteDomains[problem.slug] && uniqueInputs.size < minUnique) failures.push(`${problem.slug} has ${uniqueInputs.size} unique inputs, expected at least ${minUnique}`);
    if (features.size < minFeatureFamilies) failures.push(`${problem.slug} exposes ${features.size} edge feature families, expected at least ${minFeatureFamilies}`);
    if (problem.cases.every((item) => typeof item.expected === "boolean")) {
      const trueCases = problem.cases.filter((item) => item.expected === true).length;
      const falseCases = problem.cases.length - trueCases;
      if (trueCases < minBooleanClassCases || falseCases < minBooleanClassCases) {
        failures.push(`${problem.slug} has boolean output split true=${trueCases}, false=${falseCases}; expected at least ${minBooleanClassCases} of each`);
      }
    }
    if (problem.cases.every((item) => typeof item.expected === "number")) {
      const expectedValues = new Set(problem.cases.map((item) => item.expected));
      if (expectedValues.size < minNumericExpectedValues) {
        failures.push(`${problem.slug} has ${expectedValues.size} distinct numeric outputs, expected at least ${minNumericExpectedValues}`);
      }
    }
    if (!finiteDomains[problem.slug] && problem.cases.every((item) => Array.isArray(item.expected))) {
      const expectedValues = new Set(problem.cases.map((item) => JSON.stringify(item.expected)));
      if (expectedValues.size < minArrayExpectedValues) {
        failures.push(`${problem.slug} has ${expectedValues.size} distinct array outputs, expected at least ${minArrayExpectedValues}`);
      }
    }
    if (problem.cases.every((item) => typeof item.expected === "string")) {
      const expectedValues = new Set(problem.cases.map((item) => item.expected));
      if (expectedValues.size < minStringExpectedValues) {
        failures.push(`${problem.slug} has ${expectedValues.size} distinct string outputs, expected at least ${minStringExpectedValues}`);
      }
    }
    if (!compactInputDomains.has(problem.slug)) {
      const inputSizes = problem.cases.map((item) => inputSize(item.input));
      const uniqueInputSizes = new Set(inputSizes);
      const maxInputSize = Math.max(...inputSizes);
      if (uniqueInputSizes.size < minCompositeInputSizes) {
        failures.push(`${problem.slug} spans ${uniqueInputSizes.size} input sizes, expected at least ${minCompositeInputSizes}`);
      }
      if (maxInputSize < minCompositeMaxInputSize) {
        failures.push(`${problem.slug} max input size is ${maxInputSize}, expected at least ${minCompositeMaxInputSize}`);
      }
    }
    if (!problem.cases.some((item) => item.hidden)) failures.push(`${problem.slug} has no hidden cases`);
    if (!problem.cases.some((item) => !item.hidden)) failures.push(`${problem.slug} has no visible cases`);

    rows.push({
      id: problem.id,
      slug: problem.slug,
      cases: problem.cases.length,
      unique: uniqueInputs.size,
      edgeFeatures: features.size,
      finiteDomain: Boolean(finiteDomains[problem.slug])
    });
  } catch {
    // Ignore non-problem directories.
  }
}

rows.sort((a, b) => a.id - b.id);

console.log(`Problems: ${rows.length}`);
console.log(`Total cases: ${rows.reduce((sum, row) => sum + row.cases, 0)}`);
console.log(`Minimum unique inputs: ${Math.min(...rows.map((row) => row.unique))}`);
console.log(`Minimum edge feature families: ${Math.min(...rows.map((row) => row.edgeFeatures))}`);
console.log(`Finite-domain packs: ${rows.filter((row) => row.finiteDomain).length}`);

if (failures.length) {
  console.error("\nEdge coverage audit failures:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
}
