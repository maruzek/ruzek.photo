import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { faviconSvg } from '../../src/lib/favicon';

test('public/favicon.svg is the current logo (regenerate with pnpm icons)', () => {
  const file = readFileSync(new URL('../../public/favicon.svg', import.meta.url), 'utf8');
  expect(file).toBe(faviconSvg('auto'));
});
