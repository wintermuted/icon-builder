import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function extractTitle(content, fallback) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

function extractMermaidBlocks(content) {
  const blocks = [];
  const regex = /```mermaid\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push(match[1].trim());
  }
  return blocks;
}

export async function buildSpecIndex(root = process.cwd()) {
  const entries = await readdir(join(root, "specs"), { withFileTypes: true });
  const diagrams = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

    const filePath = join(root, "specs", entry.name);
    const content = await readFile(filePath, "utf8");
    const title = extractTitle(content, entry.name.replace(/\.md$/, ""));
    const blocks = extractMermaidBlocks(content);

    blocks.forEach((code, index) => {
      diagrams.push({
        id: `${entry.name.replace(/\.md$/, "")}-${index + 1}`,
        title: blocks.length > 1 ? `${title} (${index + 1})` : title,
        source: `specs/${entry.name}`,
        code,
      });
    });
  }

  await writeFile(
    join(root, "preview/spec-index.json"),
    `${JSON.stringify({ diagrams }, null, 2)}\n`,
    "utf8",
  );
  console.log(`Wrote ${diagrams.length} diagrams to preview/spec-index.json`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildSpecIndex().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
