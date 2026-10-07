# A little page

A small static website: plain HTML, CSS and JavaScript. There is no build step, so GitHub Pages serves it as it is.

## Make it yours

Open `index.html`. The section at the very top, marked **EDIT HERE**, is the only part you need to change: the words, the photos and (optionally) the colors.

## See it before anyone else does

```
npm run preview
```

It prints two addresses: one for this computer and one for your phone (on the same Wi-Fi). Open the phone one in Safari to see exactly what your visitor will see.

It behaves like GitHub Pages, including case-sensitive file names (`Beach.JPG` is not `beach.jpg`), so mistakes show up now instead of after you publish. If Windows asks about the firewall, choose **Private networks** and **Allow access**.

## Add photos

1. Put your original photos in a folder called `photos-original/`. It is git-ignored, so it never gets uploaded.
2. Run `npm install` once, then `npm run photos`.
3. Paste the `src:` lines it prints into `index.html`.

The tool makes small, fast copies (iPhone HEIC photos work too) and **removes the GPS location and camera details** from them. That matters because this repository is public.

## Publish with GitHub Pages

1. Push to GitHub.
2. In the repository go to **Settings → Pages**. Under *Build and deployment* choose **Deploy from a branch**, then branch `main` and folder `/ (root)`, and save.
3. After a minute it is live at `https://kartike2001.github.io/question/`.

Free GitHub accounts can only publish Pages from a public repository, so anyone who finds the repository can read the words in `index.html`. The page asks search engines not to list it.

## The QR code

```
npm run qr
```

This writes `qr/qr.png` (show it on a phone screen with the brightness up, or print it) and `qr/qr.svg` (print it at any size). It points at your GitHub Pages address. If you rename the repository, run it again.

## Before the big moment

- Open the live address on your own phone, on cellular as well as Wi-Fi.
- Scan the QR code with the normal Camera app and check that it opens the page.
- Tap through every answer (and "Go back") so you have seen every screen.
- Check that every photo shows up. A missing one appears as a dashed placeholder naming the file it couldn't find.
