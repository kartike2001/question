// tools/photos.mjs : turns your photos into small, fast, private copies for the website.
//
//   photos-original/   put your big original photos here (this folder is NEVER uploaded)
//         |
//         |   npm run photos
//         v
//   photos/            the copies the website uses: JPG, longest side 1400 px,
//                      phone rotation applied, location + camera data removed
//
// Why bother? Phone photos are 3-8 MB each (slow on cellular) and secretly contain the
// GPS spot where they were taken. This repo is published on GitHub Pages, so anything in
// it is public. The copies made here are small and carry no location.
//
// Usage:   npm install        (first time only)
//          npm run photos
//
// It prints the exact  src  line to paste into index.html for every photo.

import { readdir, readFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'photos-original');
const OUT = path.join(root, 'photos');
const MAX_EDGE = 1400;      // px, longest side. Plenty sharp for a phone screen, small to download.
const QUALITY = 82;         // JPEG quality
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff', '.gif', '.heic', '.heif']);

const kb = n => (n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
const slug = file => path.parse(file).name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'photo';

function die(message) {
  console.error('\n' + message + '\n');
  process.exit(1);
}

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  die('The photo tool needs its helper installed first.\nRun this once:   npm install\nthen run:         npm run photos');
}

await mkdir(SRC, { recursive: true });
await mkdir(OUT, { recursive: true });

const files = (await readdir(SRC)).filter(f => EXTENSIONS.has(path.extname(f).toLowerCase())).sort();
if (!files.length) {
  console.log(
    '\nNo photos found yet.\n\n' +
    '  1. Copy your photos into the folder:  photos-original/\n' +
    '  2. Run this again:                    npm run photos\n'
  );
  process.exit(0);
}

// HEIC/HEIF is what iPhones save by default. Convert it to JPEG first, then process as usual.
async function loadInput(file) {
  const buffer = await readFile(file);
  const ext = path.extname(file).toLowerCase();
  if (ext !== '.heic' && ext !== '.heif') return buffer;
  let convert;
  try {
    convert = (await import('heic-convert')).default;
  } catch {
    throw new Error('this is a HEIC photo and the HEIC helper is not installed. Run  npm install  (or export the photo as JPG).');
  }
  return Buffer.from(await convert({ buffer, format: 'JPEG', quality: 0.95 }));
}

console.log(`\nMaking web-ready copies of ${files.length} photo${files.length === 1 ? '' : 's'}...\n`);

const used = new Set();
const lines = [];
let failed = 0;

for (const file of files) {
  try {
    let name = slug(file);
    for (let n = 2; used.has(name); n++) name = `${slug(file)}-${n}`;
    used.add(name);

    const from = path.join(SRC, file);
    const to = path.join(OUT, `${name}.jpg`);
    const input = await loadInput(from);

    await sharp(input, { failOn: 'none' })
      .rotate()                                                   // apply the phone's rotation, then forget it
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })                         // transparent PNGs get a white background
      .jpeg({ quality: QUALITY, mozjpeg: true })                  // (sharp drops EXIF/GPS/etc. unless asked to keep it)
      .toFile(to);

    // Belt and braces: make sure nothing private came along.
    const meta = await sharp(to).metadata();
    if (meta.exif || meta.xmp || meta.iptc) throw new Error('metadata was still present in the copy, so it was NOT used');

    const before = (await stat(from)).size;
    const after = (await stat(to)).size;
    console.log(`  ok  ${file}  ->  photos/${name}.jpg   (${kb(before)} -> ${kb(after)}, ${meta.width}x${meta.height})`);
    lines.push(`src: \`photos/${name}.jpg\`,`);
  } catch (err) {
    failed++;
    const reason = /unsupported image format|corrupt|truncated|invalid/i.test(err.message)
      ? 'this does not look like a readable photo (it may be damaged)'
      : err.message;
    console.log(`  !!  ${file}  skipped: ${reason}`);
  }
}

if (lines.length) {
  console.log('\nPaste these into index.html (one per photo, in the  src:  spot):\n');
  for (const l of lines) console.log('    ' + l);
}
console.log(`\nDone. ${lines.length} ready${failed ? `, ${failed} skipped (see above)` : ''}. Location and camera info removed from every copy.\n`);
process.exit(lines.length ? 0 : 1);     // only "fail" if nothing worked, so npm doesn't print scary errors for one bad file
