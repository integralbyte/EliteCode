import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = path.join(ROOT, "scripts", "neetcode150_catalog.json");
const PROBLEMS_DIR = path.join(ROOT, "problems");
const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";
const SOURCE_BLOCK_START = "<!-- elitecode-source-images:start -->";
const SOURCE_BLOCK_END = "<!-- elitecode-source-images:end -->";

const slugOverrides = new Map([
  ["add-and-search-word-data-structure-design", "design-add-and-search-words-data-structure"],
]);

const contentTypeExtensions = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/jpg", ".jpg"],
  ["image/gif", ".gif"],
  ["image/webp", ".webp"],
  ["image/svg+xml", ".svg"],
]);

const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);

function htmlDecode(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function extractAttribute(tag, name) {
  const quoted = new RegExp(`${name}\\s*=\\s*([\"'])(.*?)\\1`, "i").exec(tag);
  if (quoted) {
    return htmlDecode(quoted[2].trim());
  }

  const unquoted = new RegExp(`${name}\\s*=\\s*([^\\s>]+)`, "i").exec(tag);
  return unquoted ? htmlDecode(unquoted[1].trim()) : "";
}

function normalizeImageUrl(rawUrl) {
  if (!rawUrl || rawUrl.startsWith("data:")) {
    return null;
  }
  if (rawUrl.startsWith("//")) {
    return `https:${rawUrl}`;
  }
  if (rawUrl.startsWith("/")) {
    return `https://leetcode.com${rawUrl}`;
  }
  return new URL(rawUrl).toString();
}

function extractImageUrls(html) {
  const images = [];
  const seen = new Set();
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const src = normalizeImageUrl(extractAttribute(match[0], "src"));
    if (!src || seen.has(src)) {
      continue;
    }
    seen.add(src);
    images.push({
      sourceUrl: src,
      alt: extractAttribute(match[0], "alt"),
    });
  }
  return images;
}

function leetcodeSlugFor(entry) {
  if (slugOverrides.has(entry.slug)) {
    return slugOverrides.get(entry.slug);
  }
  const fromUrl = /\/problems\/([^/]+)\//.exec(entry.source_url || "");
  return fromUrl ? fromUrl[1] : entry.slug;
}

async function fetchQuestion(entry) {
  const response = await fetch(LEETCODE_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "referer": "https://leetcode.com/problemset/",
      "user-agent": "EliteCode problem image importer",
    },
    body: JSON.stringify({
      query: "query questionContent($titleSlug: String!) { question(titleSlug: $titleSlug) { questionFrontendId title titleSlug content } }",
      variables: { titleSlug: leetcodeSlugFor(entry) },
    }),
  });

  if (!response.ok) {
    throw new Error(`LeetCode GraphQL returned ${response.status} for ${entry.slug}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(`LeetCode GraphQL error for ${entry.slug}: ${payload.errors[0].message}`);
  }
  return payload.data?.question ?? null;
}

function extensionFor(url, contentType) {
  const fromContentType = contentTypeExtensions.get((contentType || "").split(";")[0].toLowerCase());
  if (fromContentType) {
    return fromContentType;
  }

  const ext = path.extname(new URL(url).pathname).toLowerCase();
  return imageExtensions.has(ext) ? ext : ".png";
}

async function downloadImage(url, referer) {
  const response = await fetch(url, {
    headers: {
      "referer": referer || "https://leetcode.com/problemset/",
      "user-agent": "EliteCode problem image importer",
    },
  });

  if (!response.ok) {
    throw new Error(`Image download returned ${response.status} for ${url}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0) {
    throw new Error(`Image download was empty for ${url}`);
  }

  return {
    bytes,
    extension: extensionFor(url, response.headers.get("content-type")),
    contentType: response.headers.get("content-type") || "application/octet-stream",
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function removeExistingImageBlock(statement) {
  const blockPattern = new RegExp(`\\n?${SOURCE_BLOCK_START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${SOURCE_BLOCK_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n?`, "g");
  return statement.replace(blockPattern, "\n\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

function buildImageBlock(problem, images) {
  const heading = images.length === 1 ? "## Diagram" : "## Diagrams";
  const markdownImages = images
    .map((image, index) => `![${problem.title} diagram ${index + 1}](/api/problem-assets/${problem.slug}/${image.file})`)
    .join("\n\n");
  return `${SOURCE_BLOCK_START}\n${heading}\n\n${markdownImages}\n${SOURCE_BLOCK_END}`;
}

function insertImageBlock(statement, block) {
  const cleanStatement = removeExistingImageBlock(statement);
  const examplesIndex = cleanStatement.search(/\n## Examples\b/);
  if (examplesIndex >= 0) {
    return `${cleanStatement.slice(0, examplesIndex).trimEnd()}\n\n${block}\n${cleanStatement.slice(examplesIndex)}`;
  }
  return `${cleanStatement.trimEnd()}\n\n${block}`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const catalog = await readJson(CATALOG_PATH);
  const imported = [];
  const skipped = [];

  for (const entry of catalog.problems) {
    const problemPath = path.join(PROBLEMS_DIR, entry.slug, "problem.json");
    const problem = await readJson(problemPath);
    const question = await fetchQuestion(entry);
    const imageRefs = extractImageUrls(question?.content || "");

    if (imageRefs.length === 0) {
      const withoutOldBlock = removeExistingImageBlock(problem.statement);
      if (!dryRun && withoutOldBlock !== problem.statement) {
        problem.statement = withoutOldBlock;
        await writeJson(problemPath, problem);
      }
      skipped.push(entry.slug);
      continue;
    }

    const assetsDir = path.join(PROBLEMS_DIR, entry.slug, "assets");
    if (!dryRun) {
      await mkdir(assetsDir, { recursive: true });
    }

    const images = [];
    for (const [index, ref] of imageRefs.entries()) {
      const downloaded = await downloadImage(ref.sourceUrl, entry.source_url);
      const file = `original-${index + 1}${downloaded.extension}`;
      if (!dryRun) {
        await writeFile(path.join(assetsDir, file), downloaded.bytes);
      }
      images.push({
        index: index + 1,
        file,
        source_url: ref.sourceUrl,
        alt: ref.alt,
        content_type: downloaded.contentType,
        bytes: downloaded.bytes.length,
        sha256: downloaded.sha256,
      });
    }

    const manifest = {
      generated_at: new Date().toISOString(),
      source: "LeetCode question img tags",
      leetcode: {
        frontend_id: question?.questionFrontendId ?? null,
        title: question?.title ?? entry.title,
        title_slug: question?.titleSlug ?? leetcodeSlugFor(entry),
        url: entry.source_url,
      },
      images,
    };

    problem.statement = insertImageBlock(problem.statement, buildImageBlock(problem, images));
    if (!dryRun) {
      await writeJson(problemPath, problem);
      await writeJson(path.join(assetsDir, "images.json"), manifest);
    }
    imported.push({ slug: entry.slug, images: images.length });
  }

  const totalImages = imported.reduce((sum, item) => sum + item.images, 0);
  console.log(`Imported ${totalImages} images for ${imported.length} problems.`);
  console.log(`Skipped ${skipped.length} problems without online images.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
