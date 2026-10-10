const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const {pathToFileURL} = require('url');
const path = require('path');
const assert = require('assert');
const fs = require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
 const page=await browser.newPage({viewport:{width:1365,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../../index.html')).href);
 for(const [selector,count] of [['.formula',6],['.formula-notes',6],['.symbol-guide',7],['.figure-guide',5],['.live-annotation',5]])assert.equal(await page.locator(selector).count(),count,selector);
 await page.locator('#poisson .viz-grid').screenshot({path:path.resolve(__dirname,'../../preview.png')});
 const buttons=await page.locator('.symbol-help').count();assert(buttons>35);
 await page.locator('.symbol-help').first().click();assert(await page.locator('#symbol-dialog').isVisible());assert(await page.locator('#dialog-definitions dt').count()>0);assert(!(await page.locator('#dialog-definitions').innerText()).includes('梯度长度'));await page.keyboard.press('Escape');assert(!(await page.locator('#symbol-dialog').isVisible()));
 await page.locator('#rho').fill('0');await page.waitForTimeout(30);assert((await page.locator('#poisson-live').innerText()).includes('水平'));
 await page.locator('#theta').fill('90');await page.locator('#rho').fill('0.8');await page.waitForTimeout(30);assert((await page.locator('#poisson-live').innerText()).includes('(0.000, 0.800)'));
 await page.locator('#mean-kind').selectOption('nonharmonic');await page.locator('#mean-x').fill('0.2');await page.locator('#mean-y').fill('-0.1');await page.locator('#mean-radius').fill('0.5');
 await page.waitForTimeout(30);assert.equal(await page.locator('#mean-center-val').innerText(),'0.950');assert.equal(await page.locator('#mean-circle-val').innerText(),'0.700');assert.equal(await page.locator('#mean-disk-val').innerText(),'0.825');assert((await page.locator('#mean-live').innerText()).includes('0.250'));
 await page.locator('[data-proof-step="3"]').click();await page.waitForTimeout(30);assert((await page.locator('#maximum-live').innerText()).includes('A=Ω'));
 await page.locator('#flux-kind').selectOption('source');await page.locator('#flux-radius').fill('0.5');await page.waitForTimeout(30);assert.equal(await page.locator('#flux-boundary').innerText(),'3.142');assert((await page.locator('#flux-live').innerText()).includes('2R=1.00'));
 await page.locator('#energy-lambda').fill('-0.6');const E=await page.locator('#energy-current').innerText();await page.locator('#energy-lambda').fill('0.6');assert.equal(await page.locator('#energy-current').innerText(),E);await page.locator('#energy-lambda').fill('0');await page.waitForTimeout(30);assert((await page.locator('#energy-live').innerText()).includes('能量达到最低'));
 console.log(JSON.stringify({buttons,counts:'pass',liveValues:'pass',dialog:'pass',errors}));
 for(const width of [1365,390,320]){
  await page.setViewportSize({width,height:900});
  const result=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(el=>!el.closest('.toc')&&!el.closest('.formula')).map(el=>({el,r:el.getBoundingClientRect()})).filter(({r})=>r.right>innerWidth+1&&r.width>0).slice(0,12).map(({el,r})=>({tag:el.tagName,id:el.id,class:el.className?.baseVal||el.className,right:r.right,parents:el.parentElement.outerHTML.slice(0,500)}))}));
  console.log(JSON.stringify(result));
  assert.equal(result.scrollWidth,width,'viewport '+width);
 }
 await page.goto(pathToFileURL(path.resolve(__dirname,'../../index.html')).href);
 await page.locator('#boundary-preset').selectOption('hotspot');await page.locator('[data-proof-step="3"]').click();
 await page.evaluate(()=>document.querySelectorAll('details').forEach(el=>el.open=true));
 await page.setViewportSize({width:320,height:850});
 const fullOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(fullOverflow)console.log(JSON.stringify(await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,items:[...document.querySelectorAll('body *')].filter(el=>!el.closest('.toc')&&!el.closest('.formula')).map(el=>({el,r:el.getBoundingClientRect()})).filter(({r})=>r.right>innerWidth+1&&r.width>0).slice(0,20).map(({el,r})=>({tag:el.tagName,cls:el.className?.baseVal||el.className,right:r.right,parent:el.parentElement.outerHTML.slice(0,800)}))}))));assert(!fullOverflow,'320px with all proofs open');
 await page.locator('#mean-kind').selectOption('constant');assert((await page.locator('#mean-color-scale').innerText()).includes('同一种颜色'));
 await page.locator('#mean-kind').selectOption('harmonic');await page.locator('#mean-x').fill('0.75');await page.locator('#mean-y').fill('0.75');
 const fit=await page.evaluate(()=>({x:+document.getElementById('mean-x').value,y:+document.getElementById('mean-y').value,R:+document.getElementById('mean-radius').value}));assert(Math.hypot(fit.x,fit.y)+fit.R<1);
 console.log(JSON.stringify({allProofsAt320:'pass',constantLegend:'pass',radiusInsideDisk:'pass',fit}));

 assert.equal(errors.length,0);
 await page.goto(pathToFileURL(path.resolve(__dirname,'../../../../index.html')).href);
 const allCards=await page.locator('.card').count();
 assert.equal(+await page.locator('#topic-count').innerText(),allCards);
 assert.equal(await page.locator('#elliptic a[href="topics/harmonic-functions/index.html"]').count(),1);
 await page.locator('#topic-search').fill('Poisson');
 assert.equal(await page.locator('.card:visible').count(),1);
 await page.locator('#elliptic a[href="topics/harmonic-functions/index.html"]').click();
 assert(await page.locator('#annotated-textbook-v2').isVisible());
 await page.locator('.repo-nav a').first().click();assert(await page.locator('#topic-search').isVisible());
 fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify({status:'passed',formulas:6,chapterSymbolTables:7,figureGuides:5,inlineAnnotationButtons:buttons,viewports:[1365,390,320],checks:['popup and Escape','live numeric explanations','independent mean readouts','normal-derivative integral','energy symmetry','all proofs open at 320px','constant color legend','circle inside disk','catalog count and search','topic and return links'],errors},null,2)+'\n');
 await browser.close();

})().catch(e=>{console.error(e);process.exit(1)});
