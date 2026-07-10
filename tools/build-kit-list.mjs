/**
 * Renders tools/kit-list.html to src/assets/kit-list.pdf.
 *
 * The kit list used to be a binary PDF with no source, so a typo meant
 * re-authoring it by hand. Edit the HTML and re-run: npm run kit-list:pdf
 */
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(here, 'kit-list.html');
const output = path.resolve(here, '..', 'src', 'assets', 'kit-list.pdf');

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`file://${source}`, { waitUntil: 'load' });
  await page.pdf({
    path: output,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
  });
  console.log(`Wrote ${path.relative(process.cwd(), output)}`);
} finally {
  await browser.close();
}
