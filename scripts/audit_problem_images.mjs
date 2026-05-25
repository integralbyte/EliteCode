import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROBLEMS_DIR = path.join(ROOT, "problems");
const MIN_PROBLEMS_WITH_IMAGES = 45;
const MIN_TOTAL_IMAGES = 45;

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function problemDirs() {
  const entries = await readdir(PROBLEMS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(PROBLEMS_DIR, entry.name))
    .sort();
}

function statementAssetUrls(statement) {
  return [...statement.matchAll(/\/api\/problem-assets\/([^/)]+)\/([^) \n]+)/g)].map((match) => ({
    slug: decodeURIComponent(match[1]),
    file: decodeURIComponent(match[2]),
  }));
}

function fail(errors, message) {
  errors.push(message);
}

async function main() {
  const errors = [];
  let problemCount = 0;
  let imageCount = 0;

  for (const dir of await problemDirs()) {
    const problemPath = path.join(dir, "problem.json");
    const problem = await readJson(problemPath);
    const assetsDir = path.join(dir, "assets");
    const manifestPath = path.join(assetsDir, "images.json");
    const manifestExists = await exists(manifestPath);

    if ((problem.statement || "").includes("elitecode-source-images")) {
      fail(errors, `${problem.slug}: statement contains visible source-image marker text`);
    }

    for (const asset of statementAssetUrls(problem.statement || "")) {
      if (asset.slug !== problem.slug) {
        fail(errors, `${problem.slug}: statement points to ${asset.slug}`);
        continue;
      }
      if (!(await exists(path.join(assetsDir, asset.file)))) {
        fail(errors, `${problem.slug}: missing statement asset ${asset.file}`);
      }
    }

    if (!manifestExists) {
      continue;
    }

    const manifest = await readJson(manifestPath);
    if (!Array.isArray(manifest.images) || manifest.images.length === 0) {
      fail(errors, `${problem.slug}: manifest has no images`);
      continue;
    }

    problemCount += 1;
    imageCount += manifest.images.length;

    for (const image of manifest.images) {
      const imagePath = path.join(assetsDir, image.file);
      if (!(await exists(imagePath))) {
        fail(errors, `${problem.slug}: missing manifest asset ${image.file}`);
        continue;
      }

      const bytes = await readFile(imagePath);
      if (bytes.length === 0) {
        fail(errors, `${problem.slug}: empty asset ${image.file}`);
      }
      if (image.sha256 && sha256(bytes) !== image.sha256) {
        fail(errors, `${problem.slug}: sha256 mismatch for ${image.file}`);
      }
      const expectedUrl = `/api/problem-assets/${problem.slug}/${image.file}`;
      if (!problem.statement.includes(expectedUrl)) {
        fail(errors, `${problem.slug}: statement does not reference ${image.file}`);
      }
    }
  }

  if (problemCount < MIN_PROBLEMS_WITH_IMAGES) {
    fail(errors, `expected at least ${MIN_PROBLEMS_WITH_IMAGES} problems with images, found ${problemCount}`);
  }
  if (imageCount < MIN_TOTAL_IMAGES) {
    fail(errors, `expected at least ${MIN_TOTAL_IMAGES} images, found ${imageCount}`);
  }

  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }

  console.log(`Validated ${imageCount} problem images across ${problemCount} problems.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
