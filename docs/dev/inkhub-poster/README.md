# InkHub poster

The first InkHub thumbnail - the tile people see in InkHub's grid. Exported to
`docs/user/images/inkhub-poster.png` (1404 × 1872 px, A5 X portrait, black and white).
The listing that uses it: `../inkhub-listing.md`.

## Files

- `poster.html` - the poster. Texts are plain HTML; sizes, spacing and line widths are the CSS
  variables in `:root`.
- `render.mjs` - exports the PNG.
- `images/icon-white.png`, `images/wordmark-white.png` - the plugin icon and wordmark from
  `assets/icon.png` and `assets/wordmark.png`, made white for the black header, enlarged (icon
  4×4 supersampled from 48 px, edges thresholded and smoothed) and trimmed to their visible
  shape. Remake them when the assets change.
- `fonts/` - Archivo (headings, labels) and Caveat (handwriting), both SIL Open Font License
  (licences next to them). Local, so the poster looks the same offline.

## Edit and review

Open `poster.html` in a browser: it is scaled to the window. Add `?actual` to the URL to see it
1:1.

Keep it readable as a small tile (about 300 px wide in the grid): few words, heavy headings,
black and white only.

## Export

From the repo root:

```
node docs/dev/inkhub-poster/render.mjs
```

Needs Playwright with Chromium (`npm i -D playwright` and `npx playwright install chromium`).

Without Playwright: open `poster.html?actual` in Chrome, open DevTools, select the
`<div class="poster" id="poster">` element and use **Capture node screenshot**, with the zoom at
100 % and device emulation off, so the image is exactly 1404 × 1872.
