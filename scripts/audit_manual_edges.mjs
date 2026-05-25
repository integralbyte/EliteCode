import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const problemsRoot = path.join(root, "problems");
const manifestPath = path.join(problemsRoot, "manual_edge_manifest.json");
const minManualCases = Number(process.env.ELITECODE_MIN_MANUAL_EDGE_CASES ?? 3);
const minChecklistItems = Number(process.env.ELITECODE_MIN_MANUAL_EDGE_CHECKLIST_ITEMS ?? 4);

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

function assertText(value, label, failures) {
  if (typeof value !== "string" || value.trim().length < 24) failures.push(`${label} must be a specific sentence`);
}

const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const failures = [];

if (manifest.version !== 1) failures.push("manual edge manifest version must be 1");
assertText(manifest.policy, "manifest policy", failures);

const problemFiles = [];
for (const dir of await fs.readdir(problemsRoot)) {
  const file = path.join(problemsRoot, dir, "problem.json");
  try {
    await fs.access(file);
    problemFiles.push(file);
  } catch {
    // Ignore non-problem files and directories.
  }
}

const problems = new Map();
for (const file of problemFiles) {
  const problem = JSON.parse(await fs.readFile(file, "utf8"));
  problems.set(problem.slug, problem);
}

const manifestProblems = new Map((manifest.problems ?? []).map((item) => [item.slug, item]));

for (const slug of problems.keys()) {
  if (!manifestProblems.has(slug)) failures.push(`${slug} is missing from manual_edge_manifest.json`);
}

for (const slug of manifestProblems.keys()) {
  if (!problems.has(slug)) failures.push(`${slug} is listed in manual_edge_manifest.json but has no problem pack`);
}

let totalManualCases = 0;
for (const [slug, problem] of problems) {
  const entry = manifestProblems.get(slug);
  if (!entry) continue;

  if (entry.id !== problem.id) failures.push(`${slug} manifest id ${entry.id} does not match problem id ${problem.id}`);
  if (entry.title !== problem.title) failures.push(`${slug} manifest title does not match problem title`);
  assertText(entry.review_note, `${slug} review_note`, failures);

  if (!Array.isArray(entry.coverage_checklist) || entry.coverage_checklist.length < minChecklistItems) {
    failures.push(`${slug} must list at least ${minChecklistItems} manual coverage checklist items`);
  } else {
    for (const [index, item] of entry.coverage_checklist.entries()) assertText(item, `${slug} coverage_checklist[${index}]`, failures);
  }

  if (!Array.isArray(entry.manual_cases) || entry.manual_cases.length < minManualCases) {
    failures.push(`${slug} must pin at least ${minManualCases} manual edge cases`);
    continue;
  }

  const casesById = new Map(problem.cases.map((item) => [item.id, item]));
  const seenCaseIds = new Set();
  for (const [index, manualCase] of entry.manual_cases.entries()) {
    const label = `${slug} manual_cases[${index}]`;
    if (seenCaseIds.has(manualCase.case_id)) failures.push(`${label} duplicates case id ${manualCase.case_id}`);
    seenCaseIds.add(manualCase.case_id);

    const problemCase = casesById.get(manualCase.case_id);
    if (!problemCase) {
      failures.push(`${label} references missing case id ${manualCase.case_id}`);
      continue;
    }
    if (problemCase.hidden) failures.push(`${label} references hidden case ${manualCase.case_id}; manual edge cases must be visible and reviewed`);

    if (manualCase.input_digest !== digest(problemCase.input)) failures.push(`${label} input digest changed for ${manualCase.case_id}`);
    if (manualCase.expected_digest !== digest(problemCase.expected)) failures.push(`${label} expected digest changed for ${manualCase.case_id}`);
    if (!Array.isArray(manualCase.coverage_labels) || manualCase.coverage_labels.length === 0) {
      failures.push(`${label} must list at least one coverage label`);
    }
    assertText(manualCase.rationale, `${label} rationale`, failures);
    totalManualCases += 1;
  }
}

console.log(`Problems with manual edge dossiers: ${manifestProblems.size}`);
console.log(`Pinned manual edge cases: ${totalManualCases}`);
console.log(`Minimum manual cases per problem: ${minManualCases}`);
console.log(`Minimum checklist items per problem: ${minChecklistItems}`);

if (failures.length) {
  console.error("\nManual edge audit failures:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
}
