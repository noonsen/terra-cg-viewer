// astro:assets emits both an optimized derivative (referenced by pages) and a
// content-hashed copy of the original source file (a side effect of Vite's
// static asset import handling) for every content-collection image. The raw
// originals are never linked from any page but still ship in the build
// output, so this prunes any dist/_astro file whose exact filename doesn't
// appear in any built HTML/CSS/JS.
import { readdir, readFile, rm, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname.replace(/^\/([a-zA-Z]:)/, '$1');
const ASTRO_DIR = join(DIST, '_astro');
const REFERENCING_EXT = new Set(['.html', '.css', '.js', '.json', '.xml', '.txt']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

const allFiles = await walk(DIST);
const referencingFiles = allFiles.filter((f) => REFERENCING_EXT.has(extname(f)));
const assetFiles = allFiles.filter((f) => f.startsWith(ASTRO_DIR));

let haystack = '';
for (const f of referencingFiles) {
  haystack += await readFile(f, 'utf-8');
}

let removed = 0;
let bytesFreed = 0;
for (const file of assetFiles) {
  const name = file.slice(ASTRO_DIR.length + 1);
  if (!haystack.includes(name)) {
    const { size } = await stat(file);
    await rm(file);
    removed += 1;
    bytesFreed += size;
  }
}

console.log(
  `Pruned ${removed} unreferenced asset(s), freeing ${(bytesFreed / 1024 / 1024).toFixed(1)} MB`
);
