// Writes the browser-tab and home-screen icons from design/logo/logo-tiles.json: `pnpm icons` after a logo change.
// Static files rather than endpoints: sharp does not run in the workerd dev server. tests/unit/icons.test.ts fails
// when public/favicon.svg no longer matches the logo.
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { faviconSvg } from '../src/lib/favicon';

const svg = faviconSvg('auto');
await writeFile(new URL('../public/favicon.svg', import.meta.url), svg);
const png = await sharp(Buffer.from(faviconSvg('tile')), { density: 300 })
  .resize(180, 180)
  .png()
  .toBuffer();
await writeFile(new URL('../public/apple-touch-icon.png', import.meta.url), png);
console.log(`favicon.svg ${svg.length} B, apple-touch-icon.png ${png.length} B`);
