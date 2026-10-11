import assert from "node:assert/strict";
export async function verifyM3Theme(browser,engine,base){
 for(const width of [390,1280])for(const mode of ["light","dark"]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[],requests=[];
  page.on("pageerror",error=>errors.push(error.message));page.on("request",request=>requests.push(request.url()));
  await page.goto(base);await page.waitForFunction(()=>document.body.dataset.mlMenus==="ready"&&document.querySelector("#ml-appearance"));
  await page.evaluate(mode=>MaterialAppearance.set("mode",mode),mode);
  await page.evaluate(()=>scrollTo(0,0));
  const shell=await page.evaluate(()=>Object.fromEntries([".ml-toolbar",".ml-layout","#ml-sidebar","#maincontent"].map(sel=>{const r=document.querySelector(sel).getBoundingClientRect();return [sel,[r.x,r.y,r.width]];})));
  await page.locator("#fixture-name").fill("unsaved draft");
  await page.locator('[data-design-option=m3e]').click();
  assert.equal(await page.locator("html").getAttribute("data-design"),"classic");
  assert.equal(await page.locator("#fixture-name").inputValue(),"unsaved draft");
  assert.equal(await page.evaluate(()=>window.fixtureSubmissions||0),0);
  await page.reload();await page.waitForFunction(()=>document.body.dataset.mlMenus==="ready"&&document.querySelector("#ml-appearance md-switch"));
  assert.equal(await page.locator("html").getAttribute("data-design"),"m3e");
  await page.evaluate(()=>scrollTo(0,0));
  const m3Shell=await page.evaluate(()=>Object.fromEntries([".ml-toolbar",".ml-layout","#ml-sidebar","#maincontent"].map(sel=>{const r=document.querySelector(sel).getBoundingClientRect();return [sel,[r.x,r.y,r.width]];})));
  for(const key of Object.keys(shell))for(let i=0;i<3;i++)assert(Math.abs(shell[key][i]-m3Shell[key][i])<=1,key+" moved");
  assert.equal(await page.locator("#ml-appearance md-switch").count(),4);
  assert.equal(await page.locator("#ml-appearance .mdc-switch").count(),0);
  await page.waitForSelector("#real-widget .mdc-switch");
  assert.equal(await page.locator("#real-widget .mdc-switch").count(),1,"LuCI adapter changed");
  await page.evaluate(()=>{window.m3FormEvents={submit:0,reset:0};const form=document.querySelector("#fixture-form");form.addEventListener("submit",()=>m3FormEvents.submit++);form.addEventListener("reset",()=>m3FormEvents.reset++);});
  assert(await page.locator("#ml-appearance md-outlined-button").evaluateAll(buttons=>buttons.every(button=>button.type==="button"&&button.getAttribute("type")==="button")),"appearance button became a submitter");
  await page.locator("#ml-appearance .ml-mode-options:not(.ml-design-options) md-outlined-button").filter({hasText:mode==="dark"?"深色":"浅色"}).click();
  assert.deepEqual(await page.evaluate(()=>m3FormEvents),{submit:0,reset:0});
  await page.evaluate(()=>{const input=document.querySelector('#ml-appearance input[data-ml-owner=appearance]');window.m3Source=input;window.m3Events={click:0,change:0};input.addEventListener("click",()=>m3Events.click++);input.addEventListener("change",()=>m3Events.change++);window.m3Checked=input.checked;});
  const toggle=page.locator("#ml-appearance md-switch").first();
  await toggle.click();await page.waitForFunction(()=>m3Source.checked!==m3Checked);
  assert.deepEqual(await page.evaluate(()=>m3Events),{click:1,change:1});
  assert.equal(await toggle.evaluate(el=>el.selected),await page.evaluate(()=>m3Source.checked));
  await toggle.focus();await page.keyboard.press("Space");await page.waitForFunction(()=>m3Events.change===2);
  assert.equal(await page.evaluate(()=>m3Source.checked),await page.evaluate(()=>m3Checked));
  await page.evaluate(()=>m3Source.disabled=true);assert.equal(await toggle.evaluate(el=>el.disabled),true);
  await page.evaluate(()=>m3Source.disabled=false);assert.equal(await toggle.evaluate(el=>el.disabled),false);
  await page.evaluate(()=>{window.m3Row=m3Source.closest(".ml-setting-row");window.m3Parent=m3Row.parentElement;window.m3Next=m3Row.nextSibling;window.m3Fieldset=document.createElement("fieldset");m3Row.before(m3Fieldset);m3Fieldset.append(m3Row);m3Fieldset.disabled=true;});
  await page.waitForFunction(()=>document.querySelector("#ml-appearance md-switch").disabled);
  assert.equal(await page.evaluate(()=>m3Source.disabled),false);
  await page.evaluate(()=>m3Fieldset.disabled=false);await page.waitForFunction(()=>!document.querySelector("#ml-appearance md-switch").disabled);
  await page.evaluate(()=>{m3Parent.insertBefore(m3Row,m3Next);m3Fieldset.remove();});
  for(const el of await page.locator("#ml-appearance md-switch,#ml-appearance md-outlined-button").all()){
   const rect=await el.boundingBox();assert(rect.width>0&&rect.x>=0&&rect.x+rect.width<=width+1,"M3 control overflow");
   if(await el.evaluate(n=>n.tagName==="MD-SWITCH"))assert(rect.width<=48,"M3 switch exceeds existing slot");
  }
  await page.locator("#ml-hex").fill("#9575CD");await page.locator("#ml-hex").dispatchEvent("input");
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue("--md-sys-color-primary").trim()),await page.evaluate(()=>MaterialM3Palette.generate("#9575CD",MaterialAppearance.prefs.mode==="dark").system.primary));
  assert(await page.evaluate(()=>{
   const palette=MaterialM3Palette.generate(MaterialAppearance.prefs.seed,MaterialAppearance.prefs.mode==="dark"),style=getComputedStyle(document.documentElement);
   return style.getPropertyValue("--raised-surface").trim()===palette.system.surfaceContainerHigh&&style.getPropertyValue("--sidebar-surface").trim()===palette.system.surface;
  }),"legacy surfaces did not receive M3 roles");
  assert(await page.locator("#fixture-name").evaluate(input=>{const probe=document.createElement("span");probe.style.color="var(--ink)";document.body.append(probe);const actual=getComputedStyle(input),expected=getComputedStyle(probe).color;probe.remove();return actual.color===expected&&actual.webkitTextFillColor===expected;}),"native text ink lost M3 color");
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"M3 document overflow");
  for(const copy of await page.locator("#ml-appearance [data-group=general]>.ml-setting-row:has(>.ml-mode-options)>.ml-row-copy").all()){
   const r=await copy.boundingBox();assert(r.width>150,"choice description squeezed");
   const n=await copy.locator("strong").boundingBox();assert(n.height<45,"choice heading vertical");
  }
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:"dist/previews/"+engine+"-m3-settings-"+width+"-"+mode+".png",fullPage:true});
  await page.evaluate(()=>{window.m3Task=MaterialWait.start("Mock processing");});
  assert.equal(await page.locator(".ml-task-progress md-linear-progress").count(),1);
  assert.equal(await page.locator(".ml-task-progress .mdc-linear-progress__bar").count(),0);
  await page.evaluate(()=>m3Task.stop());assert.equal(await page.locator(".ml-task-progress").count(),0);
  await page.evaluate(async()=>{window.m3UI=await L.require("ui");m3UI.showModal("Mock loading",[E("p",{class:"spinning"},"Read-only fixture")]);});
  await page.waitForSelector("#ml-mdc-wait-progress md-linear-progress");
  await page.waitForSelector("#modal_overlay.mdc-dialog--open:not(.mdc-dialog--opening)");
  await page.evaluate(()=>MaterialWait.sync());
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const a=await page.locator("#ml-mdc-wait-progress").boundingBox(),b=await page.locator("#modal_overlay>.modal").boundingBox();
  assert(a.x>=b.x&&a.x+a.width<=b.x+b.width+1&&a.y>=b.y&&a.y+a.height<=b.y+b.height+1);
  await page.screenshot({path:"dist/previews/"+engine+"-m3-progress-"+width+"-"+mode+".png"});
  await page.evaluate(()=>m3UI.hideModal());await page.waitForSelector("#ml-mdc-wait-progress",{state:"detached"});
  await page.locator('[data-design-option=classic]').click();assert.equal(await page.locator("html").getAttribute("data-design"),"m3e");
  assert.deepEqual(await page.evaluate(()=>m3FormEvents),{submit:0,reset:0});
  assert.equal(await page.evaluate(()=>window.fixtureSubmissions||0),0);
  await page.reload();await page.waitForFunction(()=>document.querySelector("#ml-appearance .mdc-switch"));
  assert.equal(await page.locator("html").getAttribute("data-design"),"classic");assert.equal(await page.locator("#ml-appearance md-switch").count(),0);
  assert.equal(errors.length,0,errors.join("\n"));assert(requests.every(url=>url.startsWith(base)),"external resource request");
  await page.close();
 }
 // A missing optional M3 bundle must keep the original checkbox usable.
 const fallback=await browser.newPage();await fallback.addInitScript(()=>localStorage.setItem("materialluci-design","m3e"));
 await fallback.route("**/material-web.js?*",route=>route.abort());await fallback.goto(base);
 await fallback.waitForSelector("#ml-appearance .mdc-switch");
 assert.equal(await fallback.locator("#ml-appearance md-switch").count(),0);await fallback.close();
 const paletteFallback=await browser.newPage();await paletteFallback.addInitScript(()=>localStorage.setItem("materialluci-design","m3e"));
 await paletteFallback.route("**/palette-m3.js?*",route=>route.abort());await paletteFallback.goto(base);
 await paletteFallback.waitForSelector("#ml-appearance .mdc-switch");assert.equal(await paletteFallback.locator("html").getAttribute("data-design"),"classic");await paletteFallback.close();
 console.log(engine+": M3 light/dark mobile/desktop, native event authority, keyboard, fieldset recovery, progress cleanup, shell geometry and Classic return passed");
}
