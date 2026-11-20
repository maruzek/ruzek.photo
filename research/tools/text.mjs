import { chromium } from '/home/martin/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core/index.mjs';
const urls = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36' });
for (const u of urls) {
  const p = await ctx.newPage();
  const r = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(e => null);
  await p.waitForTimeout(2500);
  const d = await p.evaluate(() => {
    const art = document.querySelector('article') || document.body;
    const links = [...art.querySelectorAll('a')].map(a => a.href).filter(h => /Development|github\.com\/codrops|demo/i.test(h));
    return { title: document.title, text: art.innerText.replace(/\n{2,}/g, '\n').slice(0, 3500), links: [...new Set(links)].slice(0, 10) };
  });
  console.log('=====', u, r && r.status(), '\n', JSON.stringify(d, null, 1));
  await p.close();
}
await b.close();
