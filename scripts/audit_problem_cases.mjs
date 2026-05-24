import fs from "node:fs/promises";
import path from "node:path";

const problemsRoot = path.resolve(import.meta.dirname, "..", "problems");
const minCases = Number(process.env.ELITECODE_MIN_CASES ?? 2000);
const minUnique = Number(process.env.ELITECODE_MIN_UNIQUE ?? 0);

const rows = [];
for (const dir of await fs.readdir(problemsRoot)) {
  const file = path.join(problemsRoot, dir, "problem.json");
  try {
    const problem = JSON.parse(await fs.readFile(file, "utf8"));
    const unique = new Set(problem.cases.map((item) => JSON.stringify(item.input))).size;
    rows.push({
      id: problem.id,
      slug: problem.slug,
      cases: problem.cases.length,
      visible: problem.cases.filter((item) => !item.hidden).length,
      hidden: problem.cases.filter((item) => item.hidden).length,
      unique
    });
  } catch {
    // Ignore non-problem directories.
  }
}

rows.sort((a, b) => a.id - b.id);
const caseFailures = rows.filter((row) => row.cases < minCases);
const uniqueFailures = minUnique > 0 ? rows.filter((row) => row.unique < minUnique) : [];

console.log(`Problems: ${rows.length}`);
console.log(`Total cases: ${rows.reduce((sum, row) => sum + row.cases, 0)}`);
console.log(`Minimum cases per problem: ${Math.min(...rows.map((row) => row.cases))}`);
console.log(`Minimum unique inputs per problem: ${Math.min(...rows.map((row) => row.unique))}`);

if (caseFailures.length) {
  console.error(`\nProblems below ${minCases} cases:`);
  console.table(caseFailures);
}

if (uniqueFailures.length) {
  console.error(`\nProblems below ${minUnique} unique inputs:`);
  console.table(uniqueFailures);
}

if (caseFailures.length || uniqueFailures.length) {
  process.exitCode = 1;
}
