import { chromium } from '/home/martin/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core/index.mjs';
const [file, out] = process.argv.slice(2);
const b = await chromium.launch(); const errs = [];
for (const [w,h,tag] of [[1440,900,'d'],[390,844,'m']]) {
  const p = await b.newPage({ viewport:{width:w,height:h} });
  p.on('console', m => { if (m.type()==='error') errs.push(tag+': '+m.text()); }); p.on('pageerror', e => errs.push(tag+' PAGEERR: '+e.message));
  await p.goto('file://'+file); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}-${tag}-top.jpg`, type:'jpeg', quality:70 });
  const y = await p.evaluate(() => document.querySelector('#smery').offsetTop);
  await p.evaluate(y => scrollTo(0,y), y); await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}-${tag}-dirs.jpg`, type:'jpeg', quality:70, fullPage:false });
  if (tag==='d') { for (const id of ['smer-1','smer-2','smer-3']) { const yy = await p.evaluate(id => document.getElementById(id).getBoundingClientRect().top + scrollY - 60, id); await p.evaluate(y=>scrollTo(0,y), yy); await p.waitForTimeout(300); await p.screenshot({ path: `${out}-${tag}-${id}.jpg`, type:'jpeg', quality:70 }); } }
  const ow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); errs.push(tag+' overflowX='+ow);
}
console.log(errs.join('\n')); await b.close();
