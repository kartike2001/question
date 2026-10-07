// tools/preview.mjs : see your page the way it will look once it's published, on this computer
// AND on your own phone.
//
//   npm run preview
//
// It prints two addresses:
//   - one for this computer
//   - one for your phone (the phone must be on the same Wi-Fi). Open it in Safari.
//
// It behaves like GitHub Pages: file names are case-sensitive, so a photo called  Beach.JPG
// but typed as  beach.jpg  fails here too, instead of surprising you after you publish.
// Only the website's own files are shared (index.html, assets, photos, qr), never your
// photos-original folder or anything else on this computer.
//
// Keep the window open while you look. Press Ctrl+C to stop.

import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { readFile, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = await realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const SHARED = ['/assets/', '/photos/', '/qr/'];         // what GitHub Pages would publish (besides index.html)
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  const send = (code, body, type = 'text/plain; charset=utf-8') => {
    res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });   // no caching: refresh shows your edits
    res.end(body);
  };
  try {
    let url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (url === '/') url = '/index.html';
    if (url !== '/index.html' && !SHARED.some(p => url.startsWith(p))) return send(404, 'Not found');

    const wanted = path.join(root, url);
    const actual = await realpath(wanted);                    // the file's real spelling on disk
    if (actual !== wanted) return send(404, `Not found. GitHub Pages would not find this either: the file name has different capital letters (${path.basename(actual)}).`);
    // Double-check the real location (also catches shortcuts that point outside the site).
    const rel = '/' + path.relative(root, actual).split(path.sep).join('/');
    if (rel !== '/index.html' && !SHARED.some(p => rel.startsWith(p))) return send(404, 'Not found');
    send(200, await readFile(actual), TYPES[path.extname(actual).toLowerCase()] || 'application/octet-stream');
  } catch {
    send(404, 'Not found');
  }
});

function listen(port, triesLeft) {
  server.once('error', err => {
    if (err.code === 'EADDRINUSE' && triesLeft > 0) return listen(port + 1, triesLeft - 1);
    console.error('\nCould not start the preview: ' + err.message + '\n');
    process.exit(1);
  });
  server.listen(port, '0.0.0.0', () => {
    const lan = Object.values(os.networkInterfaces()).flat()
      .filter(i => i && (i.family === 'IPv4' || i.family === 4) && !i.internal).map(i => i.address);
    console.log('\nPreview is running.\n');
    console.log(`  On this computer:            http://localhost:${port}/`);
    for (const ip of lan) console.log(`  On your phone (same Wi-Fi):  http://${ip}:${port}/`);
    if (lan.length > 1) console.log('\n  (Several addresses? Your Wi-Fi one usually starts with 192.168 or 10. Try each until one loads.)');
    console.log('\n  If Windows asks about the firewall, choose "Private networks" > Allow access.');
    console.log('  Keep this window open while you look. Press Ctrl+C to stop.\n');
  });
}
listen(+process.env.PORT || +process.argv[2] || 8080, 10);
