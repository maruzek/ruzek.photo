import { chromium } from '/home/martin/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core/index.mjs';
const [u, kw] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36' });
const p = await ctx.newPage();
const r = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(e => null);
await p.waitForTimeout(6000);
const d = await p.evaluate((kw) => {
  const t = document.body.innerText;
  const links = [...document.querySelectorAll('a')].filter(a => /demo|code/i.test(a.textContent.trim())).map(a => a.textContent.trim()+': '+a.href);
  const out = []; const re = new RegExp(kw, 'gi'); let m; let last=-2000;
  while ((m = re.exec(t)) && out.length < 6) { if (m.index - last > 1200) { out.push(t.slice(Math.max(0,m.index-300), m.index+900)); last = m.index; } }
  return { title: document.title, links: [...new Set(links)].slice(0,8), snippets: out };
}, kw);
console.log(r && r.status(), JSON.stringify(d, null, 1));
await b.close();
