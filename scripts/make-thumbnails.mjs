// Builds grid thumbnails for the gallery: public/thumbs/<basename>.webp
// (800px on the long edge, WebP quality 72, metadata stripped).
//
// RERUN THIS whenever gallery photos are added or replaced:
//   node scripts/make-thumbnails.mjs
//
// The photo list is read from the `photos` array in components/Gallery.tsx.
// Idempotent: thumbnails newer than their source are left alone (use --force
// to rebuild everything).
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const publicDir = path.join(root, "public");
const outDir = path.join(publicDir, "thumbs");
const force = process.argv.includes("--force");

const gallery = fs.readFileSync(path.join(root, "components/Gallery.tsx"), "utf8");
const srcs = [...gallery.matchAll(/src:\s*"([^"]+)"/g)].map((m) => m[1]);
if (srcs.length === 0) {
  console.error("No photos found in components/Gallery.tsx");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

for (const src of srcs) {
  const input = path.join(publicDir, src);
  const base = path.basename(src).replace(/\.[^.]+$/, "");
  const output = path.join(outDir, `${base}.webp`);
  if (!fs.existsSync(input)) {
    console.error(`MISSING source ${src}`);
    process.exitCode = 1;
    continue;
  }
  const fresh = fs.existsSync(output) && fs.statSync(output).mtimeMs >= fs.statSync(input).mtimeMs;
  if (fresh && !force) {
    console.log(`skip   ${path.relative(root, output)} (${fs.statSync(output).size} bytes, up to date)`);
    continue;
  }
  await sharp(input)
    .rotate() // honour EXIF orientation before metadata is stripped
    .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 72 }) // sharp drops metadata by default
    .toFile(output);
  console.log(`wrote  ${path.relative(root, output)} (${fs.statSync(output).size} bytes)`);
}
