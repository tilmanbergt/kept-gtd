// Renders poster.html to a 1404 x 1872 PNG for InkHub.
// Usage (from the repo root): node docs/dev/inkhub-poster/render.mjs [output.png]
// Default output: docs/user/images/inkhub-poster.png. Needs Playwright with Chromium
// (npm i -D playwright && npx playwright install chromium) - or export by hand, see README.md.
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] ?? path.resolve(here, '../../user/images/inkhub-poster.png');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1404, height: 1872 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, 'poster.html')).href + '?actual');
await page.evaluate(() => document.fonts.ready);
await page.locator('#poster').screenshot({ path: out });
await browser.close();
console.log('Poster written to ' + out);
