import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const problemsDir = path.join(root, "problems");
const publicDir = path.join(root, "frontend", "public");
const dataDir = path.join(publicDir, "problem-data");
const assetsDir = path.join(publicDir, "problem-assets");

await fs.rm(dataDir, { recursive: true, force: true });
await fs.rm(assetsDir, { recursive: true, force: true });
await fs.mkdir(dataDir, { recursive: true });
await fs.mkdir(assetsDir, { recursive: true });

const entries = await fs.readdir(problemsDir, { withFileTypes: true });
const problems = [];

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const slug = entry.name;
  const problemPath = path.join(problemsDir, slug, "problem.json");
  try {
    const problem = JSON.parse(await fs.readFile(problemPath, "utf8"));
    const publicProblem = {
      ...problem,
      cases: problem.cases.filter((testCase) => !testCase.hidden)
    };
    await fs.writeFile(path.join(dataDir, `${slug}.json`), JSON.stringify(publicProblem) + "\n");
    problems.push({
      id: problem.id,
      slug: problem.slug,
      title: problem.title,
      difficulty: problem.difficulty,
      tags: problem.tags ?? [],
      stats: problem.stats ?? { accepted: "0", submissions: "0", acceptance_rate: "0%" },
      solved: false
    });

    const sourceAssets = path.join(problemsDir, slug, "assets");
    try {
      await fs.access(sourceAssets);
      await fs.cp(sourceAssets, path.join(assetsDir, slug), { recursive: true });
    } catch {
      // Problem has no static assets.
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

problems.sort((left, right) => left.id - right.id);
await fs.writeFile(
  path.join(dataDir, "index.json"),
  JSON.stringify({ problems, last_opened_slug: null }) + "\n"
);

console.log(`Exported ${problems.length} static problem packs to frontend/public/problem-data`);
