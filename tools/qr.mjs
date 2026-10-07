// tools/qr.mjs : makes a QR code that opens your published page.
//
//   npm run qr                           uses your GitHub Pages address (worked out from  git remote)
//   npm run qr -- https://example.com/   or any address you like
//
// Writes:   qr/qr.png   a big square picture: show it on a phone screen, or print it
//           qr/qr.svg   the same code as a vector, sharp at any print size
//
// IMPORTANT: always scan the finished code with a real phone (the normal Camera app) before
// the big moment. If you rename the GitHub repo, the address changes: run this again.

import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'qr');

function die(message) {
  console.error('\n' + message + '\n');
  process.exit(1);
}

// https://github.com/<owner>/<repo>.git  ->  https://<owner>.github.io/<repo>/
function pagesUrlFromGit() {
  try {
    const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const m = remote.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);
    if (!m) return null;
    const owner = m[1].toLowerCase();
    const repo = m[2];
    return repo.toLowerCase() === `${owner}.github.io` ? `https://${owner}.github.io/` : `https://${owner}.github.io/${repo}/`;
  } catch {
    return null;
  }
}

let QRCode;
try {
  QRCode = (await import('qrcode')).default;
} catch {
  die('The QR tool needs its helper installed first.\nRun this once:   npm install\nthen run:         npm run qr');
}

const url = (process.argv[2] || pagesUrlFromGit() || '').trim();
if (!/^https?:\/\/\S+$/i.test(url)) {
  die('I could not work out your page address.\nTell me what it is, like this:\n\n    npm run qr -- https://yourname.github.io/your-repo/');
}

const options = {
  errorCorrectionLevel: 'Q',     // can still scan with ~25% of the code covered or glared out
  margin: 4,                     // the blank border QR scanners need around the code
  color: { dark: '#1a2160', light: '#ffffff' },   // very dark ink-blue on white: as scannable as black
};

await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'qr.png'), await QRCode.toBuffer(url, { ...options, type: 'png', width: 1200 }));
await writeFile(path.join(OUT, 'qr.svg'), await QRCode.toString(url, { ...options, type: 'svg' }));

console.log(`\nQR code for:  ${url}\n`);
console.log('  qr/qr.png   show it on a phone screen (turn the brightness up), or print it');
console.log('  qr/qr.svg   for printing at any size\n');
console.log('Now test it: open the normal Camera app on a phone, point it at the code, and make sure the page opens.\n');
