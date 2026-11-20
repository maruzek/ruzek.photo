import { chromium } from '/home/martin/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
const [url, slug, out, clickText] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(()=>{});
await p.waitForTimeout(7000);
const cdp = await ctx.newCDPSession(p);
const snap = async (name) => { const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 72 }); fs.writeFileSync(`${out}/${slug}-${name}.jpg`, Buffer.from(r.data, 'base64')); console.log('saved', name); };
await snap('d-hero');
if (clickText) { await p.getByText(clickText, { exact: true }).first().click({ timeout: 8000 }).catch(e=>console.log('noclick', String(e).slice(0,80))); await p.waitForTimeout(5000); await snap('d-entered'); }
for (let i = 1; i <= 3; i++) { await p.mouse.wheel(0, 1100); await p.waitForTimeout(2200); await snap('d-scroll' + i); }
const info = await p.evaluate(() => ({ title: document.title, gsap: !!window.gsap, three: !!window.THREE, lenis: document.documentElement.classList.contains('lenis'), h: document.documentElement.scrollHeight }));
console.log(JSON.stringify(info));
await b.close();
