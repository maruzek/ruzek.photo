import { chromium } from '/home/martin/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core/index.mjs';
const dir = process.argv[2]; const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1800,height:900}});
for (const i of [0,1,2]) { await p.goto(`file://${dir}/sheet${i}.html`); await p.waitForTimeout(800); await p.screenshot({path:`${dir}/sheet${i}.jpg`,fullPage:true,type:'jpeg',quality:60}); }
await b.close();
