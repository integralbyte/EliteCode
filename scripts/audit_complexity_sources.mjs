import fs from "node:fs/promises";

const manifest = JSON.parse(await fs.readFile("problems/reference_complexity_manifest.json", "utf8"));
const problems = Object.values(manifest.problems);

const cache = new Map();

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function extractNeetcodeRecommendation(html) {
  const start = html.indexOf("Recommended Time");
  if (start === -1) return null;
  const end = html.indexOf("</details>", start);
  if (end === -1) return null;
  return stripHtml(html.slice(start, end)).replace(/^Recommended Time & Space Complexity\s*/, "");
}

function hasAlgorithmEvidence(url, text) {
  const normalized = text.toLowerCase();
  if (url.includes("manacher")) {
    return normalized.includes("manacher") && (normalized.includes("linear") || normalized.includes("o(n)"));
  }
  if (url.includes("quickselect")) {
    return normalized.includes("quickselect") && normalized.includes("o(n)");
  }
  if (url.includes("prefix-function")) {
    return normalized.includes("prefix function") && normalized.includes("o(n)");
  }
  return true;
}

async function fetchSource(url) {
  if (cache.has(url)) return cache.get(url);
  const response = await fetch(url);
  const html = await response.text();
  const result = {
    url,
    ok: response.ok,
    status: response.status,
    html,
    text: stripHtml(html),
  };
  cache.set(url, result);
  return result;
}

const rows = [];
for (const problem of problems.sort((a, b) => a.id - b.id)) {
  const source = await fetchSource(problem.source_url);
  const isNeetcode = problem.source_url.startsWith("https://neetcode.io/solutions/");
  const recommendation = isNeetcode ? extractNeetcodeRecommendation(source.html) : null;
  const hasEvidence = isNeetcode ? Boolean(recommendation) : hasAlgorithmEvidence(problem.source_url, source.text);
  rows.push({
    id: problem.id,
    slug: Object.entries(manifest.problems).find(([, value]) => value === problem)[0],
    title: problem.title,
    time: problem.time,
    space: problem.space,
    source_url: problem.source_url,
    source_status: source.status,
    source_ok: source.ok,
    recommendation,
    evidence_ok: source.ok && hasEvidence,
  });
}

const failures = rows.filter((row) => !row.evidence_ok);
const report = {
  checked_at: new Date().toISOString(),
  problem_count: rows.length,
  unique_sources: cache.size,
  verified_sources: rows.length - failures.length,
  failed_count: failures.length,
  failures,
  rows,
};

await fs.mkdir("reports", { recursive: true });
await fs.writeFile("reports/complexity_source_audit.json", JSON.stringify(report, null, 2) + "\n");

console.log(`Problems: ${report.problem_count}`);
console.log(`Unique source URLs: ${report.unique_sources}`);
console.log(`Verified source evidence: ${report.verified_sources}`);
console.log(`Source evidence failures: ${report.failed_count}`);
console.log("Wrote reports/complexity_source_audit.json");

if (failures.length) {
  for (const failure of failures) {
    console.log(`${failure.id} ${failure.slug}: source ${failure.source_status} ${failure.source_url}`);
  }
  process.exit(1);
}
