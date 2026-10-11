import assert from "node:assert/strict";
export async function verifySystemLayout(browser,engine,base){
 for(const width of [390,1280])for(const mode of ['light','dark']){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(mode=>{localStorage.setItem('materialluci-design','m3e');localStorage.setItem('materialluci-mode',mode);},mode);
  await page.goto(base+'/system.html');
  await page.waitForSelector('#view [data-tab-title][data-tab-active=true]');
  await page.waitForSelector('#view [data-tab=timesync] md-switch',{state:'attached'});
  for(const name of ['general','logging','timesync','zram','general']){
   await page.locator('.cbi-tabmenu li[data-tab="'+name+'"] a').click();
   const pane=page.locator('#view [data-tab-title][data-tab="'+name+'"]');
   await page.waitForFunction(name=>document.querySelector('#view [data-tab-title][data-tab="'+name+'"]').dataset.tabActive==='true',name);
   assert.equal(await page.locator('#view [data-tab-title]:visible').count(),1,'inactive tabs occupy layout');
   const field=pane.locator('input[type=text],textarea').first();
   if(await field.count()){await field.focus();await page.waitForTimeout(350);}
   await page.evaluate(()=>scrollTo(0,Math.min(180,document.documentElement.scrollHeight-innerHeight)));
   const before=await page.evaluate(()=>({y:scrollY,h:document.documentElement.scrollHeight}));
   await page.evaluate(()=>{window.dispatchEvent(new Event('resize'));window.visualViewport?.dispatchEvent(new Event('resize'));});
   await page.waitForTimeout(1200);
   const after=await page.evaluate(()=>({y:scrollY,h:document.documentElement.scrollHeight}));
   assert(Math.abs(after.y-before.y)<=1,name+': unsolicited scrolling '+JSON.stringify({before,after}));
   assert(Math.abs(after.h-before.h)<=1,name+': growing layout');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'system horizontal overflow');
  }
  const textarea=page.locator('#view textarea');
  await textarea.fill('Draft notes preserved');assert.equal(await textarea.inputValue(),'Draft notes preserved');
  const h=await textarea.evaluate(el=>el.getBoundingClientRect().height);await page.waitForTimeout(1000);
  assert.equal(await textarea.evaluate(el=>el.getBoundingClientRect().height),h,'textarea flex sizing loop');
  await page.evaluate(()=>{document.activeElement.blur();scrollTo(0,0);});await page.screenshot({path:'dist/previews/'+engine+'-m3-system-'+width+'-'+mode+'.png',fullPage:true});
  const timeButtons=page.locator('#view .control-group>button');
  assert(await timeButtons.evaluateAll(nodes=>nodes.every(el=>parseFloat(getComputedStyle(el).borderRadius)>=24)),'time sync action lost M3 shape');
  await page.goto(base+'/sshkeys.html');
  await page.waitForSelector('#view .add-item button md-ripple');
  const input=page.locator('#view .add-item>input'),button=page.locator('#view .add-item>button');
  const a=await input.boundingBox(),b=await button.boundingBox();
  assert(a.width>=180,'SSH input squeezed');assert(b.width>=112&&b.height>=48,'SSH action squeezed');
  assert(a.x>=0&&a.x+a.width<=width+1&&b.x+b.width<=width+1,'SSH row overflow');
  assert(a.y+a.height<=b.y+1||Math.abs(a.y-b.y)<=4,'SSH controls misaligned');
  await input.fill('invalid key');await button.click();
  await page.waitForSelector('#modal_overlay .warning');assert.deepEqual(await page.evaluate(()=>systemFixtureCalls),[],'invalid key invoked write');
  await page.evaluate(async()=>{(await L.require('ui')).hideModal();});
  await page.waitForFunction(()=>!document.body.classList.contains('modal-overlay-active'));
  await page.screenshot({path:'dist/previews/'+engine+'-m3-sshkeys-'+width+'-'+mode+'.png',fullPage:true});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{window.waveTask=MaterialWait.start('Reduced motion');});
  assert.equal(await page.locator('.ml-wave-active').evaluate(el=>el.getAnimations().length),0,'reduced motion wave still animates');
  await page.evaluate(()=>waveTask.stop());
  assert.equal(errors.length,0,errors.join('\n'));await page.close();
 }
 console.log(engine+': upstream system tabs, stable scroll/textarea, SSH callbacks, responsive M3E surfaces and reduced motion passed');
}
