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
  assert.equal(await page.locator("#ml-appearance md-switch").count(),5);
  assert.equal(await page.locator("#ml-appearance .mdc-switch").count(),0);
  await page.waitForSelector("#real-widget md-switch");
  assert.equal(await page.locator("#real-widget .mdc-switch").count(),0,"M3 LuCI switch still uses MDC");
  await page.evaluate(()=>{window.businessInput=document.querySelector("#real-widget input[type=checkbox]");window.businessEvents={click:0,change:0};businessInput.addEventListener("click",()=>businessEvents.click++);businessInput.addEventListener("change",()=>businessEvents.change++);window.businessBefore=fixtureCheckbox.getValue();});
  await page.locator("#real-widget md-switch").click();
  assert.notEqual(await page.evaluate(()=>fixtureCheckbox.getValue()),await page.evaluate(()=>businessBefore));
  assert.deepEqual(await page.evaluate(()=>businessEvents),{click:1,change:1});
  await page.evaluate(()=>fixtureCheckbox.setValue("1"));
  assert.equal(await page.locator("#real-widget md-switch").evaluate(el=>el.selected),true);
  await page.waitForSelector("#ml-appearance md-text-button");
  assert(await page.locator("#ml-appearance md-text-button").evaluateAll(nodes=>nodes.every(el=>el.type==="button"&&!el.name)));
  await page.evaluate(()=>{
   const group=document.createElement("fieldset");group.id="m3-selection-fixture";
   group.innerHTML='<span data-ml-selection><input id="m3-check" type="checkbox" name="m3Choice" value="yes"><label for="m3-check">复选项</label></span><span data-ml-selection><input id="m3-radio-a" type="radio" name="m3Radio" value="a" checked><label for="m3-radio-a">选项 A</label></span><span data-ml-selection><input id="m3-radio-b" type="radio" name="m3Radio" value="b"><label for="m3-radio-b">选项 B</label></span>';
   document.querySelector("#fixture-form").append(group);
   window.selectionEvents={click:0,change:0};document.querySelector("#m3-check").addEventListener("click",()=>selectionEvents.click++);document.querySelector("#m3-check").addEventListener("change",()=>selectionEvents.change++);
  });
  await page.waitForSelector("#m3-selection-fixture md-checkbox");
  assert.equal(await page.locator("#m3-selection-fixture md-radio").count(),2);
  await page.locator("#m3-selection-fixture md-checkbox").click();
  assert.deepEqual(await page.evaluate(()=>selectionEvents),{click:1,change:1});
  assert.equal(await page.locator("#m3-check").isChecked(),true);
  await page.locator("#m3-selection-fixture md-checkbox").focus();await page.keyboard.press("Space");
  assert.equal(await page.locator("#m3-check").isChecked(),false);
  await page.locator("#m3-selection-fixture md-radio").last().click();
  assert.equal(await page.locator("#m3-radio-a").isChecked(),false);assert.equal(await page.locator("#m3-radio-b").isChecked(),true);
  assert.equal(await page.locator("#m3-selection-fixture md-radio").first().evaluate(el=>el.checked),false);
  await page.keyboard.press("ArrowLeft");assert.equal(await page.locator("#m3-radio-a").isChecked(),true);
  assert.equal(await page.locator("#m3-selection-fixture md-radio").last().evaluate(el=>el.checked),false,"M3 radio decoration diverged from native group");
  assert.equal(await page.locator("#m3-selection-fixture md-radio").first().evaluate(el=>el.tabIndex),0);
  await page.evaluate(()=>document.querySelector("#m3-check").indeterminate=true);
  assert.equal(await page.locator("#m3-selection-fixture md-checkbox").evaluate(el=>el.indeterminate),true);
  await page.evaluate(()=>document.querySelector("#m3-selection-fixture").disabled=true);
  await page.waitForFunction(()=>[...document.querySelectorAll("#m3-selection-fixture md-checkbox,#m3-selection-fixture md-radio")].every(el=>el.disabled));
  assert.equal(await page.locator("#m3-check").evaluate(el=>el.disabled),false);
  await page.evaluate(()=>document.querySelector("#m3-selection-fixture").disabled=false);
  await page.waitForFunction(()=>!document.querySelector("#m3-selection-fixture md-checkbox").disabled);
  assert.deepEqual(await page.evaluate(()=>new FormData(document.querySelector("#fixture-form")).getAll("m3Radio")),["a"]);
  assert(await page.locator("#m3-selection-fixture md-checkbox,#m3-selection-fixture md-radio").evaluateAll(nodes=>nodes.every(el=>!el.hasAttribute("name"))));

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
  await page.evaluate(async()=>{window.m3UI=await L.require("ui");m3UI.changes.displayStatus("notice spinning",E("p","正在等待配置被应用… 87s"));});
  await page.waitForSelector("#ml-mdc-wait-progress md-linear-progress");
  await page.waitForSelector("#modal_overlay.mdc-dialog--open:not(.mdc-dialog--opening)");
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const a=await page.locator("#ml-mdc-wait-progress").boundingBox(),b=await page.locator("#modal_overlay>.modal").boundingBox();
  assert(a.x>=b.x&&a.x+a.width<=b.x+b.width+1&&a.y>=b.y&&a.y+a.height<=b.y+b.height+1);
  const track=page.locator("#ml-mdc-wait-progress md-linear-progress");
  const painted=await track.boundingBox();assert(painted.width>100&&Math.abs(painted.width-a.width)<1&&Math.abs(painted.height-4)<1,"M3 painted track geometry");
  await page.waitForFunction(()=>document.querySelector("#ml-mdc-wait-progress md-linear-progress")?.shadowRoot?.querySelector(".primary-bar")?.getAnimations().some(a=>a.playState==="running"&&a.currentTime>0));
  await page.evaluate(()=>{window.m3Track=document.querySelector("#ml-mdc-wait-progress md-linear-progress");window.m3Animation=m3Track.shadowRoot.querySelector(".primary-bar").getAnimations()[0];window.m3Time=m3Animation.currentTime;});
  await page.evaluate(()=>m3UI.changes.displayStatus("notice spinning",E("p","正在等待配置被应用… 86s")));
  await page.waitForFunction(()=>m3Animation.currentTime>m3Time);
  assert.equal(await track.evaluate(el=>el===window.m3Track),true,"countdown replaced M3 progress");
  await page.screenshot({path:"dist/previews/"+engine+"-m3-progress-"+width+"-"+mode+".png"});
  await page.evaluate(()=>m3UI.hideModal());await page.waitForSelector("#ml-mdc-wait-progress",{state:"detached"});
  // Exercise the real View.__init__ lifecycle in the active M3 design.
  await page.evaluate(async()=>{
   const view=document.createElement("div");view.id="view";document.querySelector("#maincontent").prepend(view);scrollTo(0,0);
   window.m3View=await L.require("view");window.m3Pending=new Promise(resolve=>window.m3Resolve=resolve);
   window.m3ViewPromise=m3View.prototype.__init__.call({load:()=>m3Pending,render:()=>E("p","视图已载入"),addFooter:()=>null});
  });
  await page.waitForSelector(".ml-view-progress md-linear-progress");
  assert.equal(await page.locator(".ml-view-progress .mdc-linear-progress__bar").count(),0);
  assert.equal(await page.locator("#view").getAttribute("class"),"ml-view-loading");
  await page.waitForFunction(()=>document.querySelector(".ml-view-progress md-linear-progress")?.shadowRoot?.querySelector(".primary-bar")?.getAnimations().some(a=>a.playState==="running"&&a.currentTime>0));
  await page.screenshot({path:"dist/previews/"+engine+"-m3-view-loading-"+width+"-"+mode+".png"});
  await page.evaluate(()=>m3Resolve());await page.waitForSelector(".ml-view-progress",{state:"detached"});await page.evaluate(()=>document.getElementById("view").remove());

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
