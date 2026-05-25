import fs from "node:fs/promises";
import path from "node:path";

const problemsRoot = path.resolve(import.meta.dirname, "..", "problems");
const minCases = Number(process.env.ELITECODE_MIN_CASES ?? 2000);
const minUnique = Number(process.env.ELITECODE_MIN_UNIQUE_NONFINITE ?? 500);
const minFeatureFamilies = Number(process.env.ELITECODE_MIN_EDGE_FEATURES ?? 4);

const finiteDomains = {
  "generate-parentheses": { field: "n", values: range(1, 8) },
  "n-queens": { field: "n", values: range(1, 8) },
  "climbing-stairs": { field: "n", values: range(1, 75) }
};

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNumberArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
}

function isMatrix(value) {
  return Array.isArray(value) && value.length > 0 && value.every((row) => Array.isArray(row));
}

function addScalarFeatures(features, value, prefix) {
  if (typeof value === "number") {
    if (value === 0) features.add(`${prefix}:zero`);
    if (value === 1) features.add(`${prefix}:one`);
    if (value < 0) features.add(`${prefix}:negative`);
    if (value > 0) features.add(`${prefix}:positive`);
    if (Number.isInteger(value)) features.add(`${prefix}:integer`);
    if (Math.abs(value) <= 1) features.add(`${prefix}:small-number`);
    if (Math.abs(value) >= 50) features.add(`${prefix}:largeish-number`);
    if (Math.abs(value) >= 1000) features.add(`${prefix}:large-number`);
  } else if (typeof value === "boolean") {
    features.add(`${prefix}:boolean-${value}`);
  } else if (typeof value === "string") {
    if (value.length === 0) features.add(`${prefix}:empty-string`);
    if (value.length === 1) features.add(`${prefix}:single-char`);
    if (value.length >= 10) features.add(`${prefix}:long-string`);
    if (value === [...value].reverse().join("") && value.length > 1) features.add(`${prefix}:palindrome-string`);
    if (/[^a-zA-Z0-9]/.test(value)) features.add(`${prefix}:punctuation`);
    if (new Set(value).size < value.length) features.add(`${prefix}:repeated-chars`);
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
    if (new Set(value).size < value.length) features.add(`${prefix}:duplicates`);
    if (value.every((item, index) => index === 0 || value[index - 1] <= item)) features.add(`${prefix}:sorted`);
    if (value.every((item, index) => index === 0 || value[index - 1] >= item)) features.add(`${prefix}:reverse-sorted`);
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
