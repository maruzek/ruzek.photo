// Usage: node shot.mjs <url> <slug> [outDir]
// Captures desktop hero + scroll frames + mobile hero, and dumps tech/fonts/colors JSON.
import { chromium } from '/home/martin/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
const [url, slug, outDir = process.cwd()] = process.argv.slice(2);
if (!url || !slug) { console.error('usage: node shot.mjs <url> <slug> [outDir]'); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const out = { url, slug, files: [] };
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'cs-CZ' });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3500); // let intro/loader animations finish
  const f0 = `${outDir}/${slug}-d-hero.jpg`; await page.screenshot({ path: f0, type: 'jpeg', quality: 72 }); out.files.push(f0);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const steps = Math.min(6, Math.max(1, Math.floor(h / 900) - 1));
  for (let i = 1; i <= steps; i++) {
    const y = Math.round((h - 900) * i / (steps + 1));
    await page.mouse.wheel(0, 0); await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(1600);
    const f = `${outDir}/${slug}-d-scroll${i}.jpg`; await page.screenshot({ path: f, type: 'jpeg', quality: 70 }); out.files.push(f);
  }
  out.info = await page.evaluate(() => {
    const w = window;
    const scripts = [...document.scripts].map(s => s.src).filter(Boolean);
    const libs = { gsap: !!w.gsap, ScrollTrigger: !!(w.ScrollTrigger || (w.gsap && w.gsap.plugins && w.gsap.plugins.scrollTrigger)), lenis: !!(w.Lenis || w.lenis || document.documentElement.classList.contains('lenis')), locomotive: !!document.querySelector('[data-scroll-container]'), three: !!w.THREE, barba: !!w.barba, swup: !!w.swup, swiper: !!w.Swiper, framer: !!document.querySelector('[data-framer-name]'), webflow: !!w.Webflow, wordpress: !!document.querySelector('link[href*="wp-content"]'), squarespace: !!w.Static && !!w.Static.SQUARESPACE_CONTEXT, nextjs: !!w.__NEXT_DATA__ || !!document.querySelector('#__next') };
    const fams = new Map(); const cols = new Map(); const bgs = new Map();
    for (const el of [...document.querySelectorAll('body *')].slice(0, 3000)) {
      const cs = getComputedStyle(el); if (!el.offsetParent && cs.position !== 'fixed') continue;
      const txt = el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (txt) { const k = cs.fontFamily.split(',')[0].replace(/["']/g,'') + ' ' + cs.fontWeight; fams.set(k, (fams.get(k)||0)+1); cols.set(cs.color, (cols.get(cs.color)||0)+1); }
      if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') bgs.set(cs.backgroundColor, (bgs.get(cs.backgroundColor)||0)+1);
    }
    const top = m => [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).map(e=>e[0]);
    const h1 = document.querySelector('h1'); const h1s = h1 ? getComputedStyle(h1) : null;
    return { title: document.title, libs, scripts: scripts.slice(0, 25), fonts: top(fams), textColors: top(cols), bgColors: [getComputedStyle(document.body).backgroundColor, ...top(bgs)], h1: h1 ? { text: h1.textContent.trim().slice(0,120), size: h1s.fontSize, family: h1s.fontFamily, weight: h1s.fontWeight, transform: h1s.textTransform } : null, scrollHeight: document.documentElement.scrollHeight };
  });
  await ctx.close();
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mp = await m.newPage(); await mp.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {}); await mp.waitForTimeout(3000);
  const fm = `${outDir}/${slug}-m-hero.jpg`; await mp.screenshot({ path: fm, type: 'jpeg', quality: 65 }); out.files.push(fm);
  await m.close();
} catch (e) { out.error = String(e); }
await browser.close();
fs.writeFileSync(`${outDir}/${slug}.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
