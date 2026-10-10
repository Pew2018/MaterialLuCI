import assert from "node:assert/strict";
import fs from "node:fs";
export async function verifySixUI(browser,name,base){
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(base);await page.waitForFunction(()=>window.fixtureCheckbox&&document.body.dataset.mlMenus==="ready");
 // An initially paused LuCI indicator has no native handler; the theme must
 // make that same indicator resume polling without reloading the page.
 await page.evaluate(async()=>{
  const poll=await L.require("poll"),ui=await L.require("ui");window.testPoll=poll;window.pollStarts=0;window.pollStops=0;const nativeStart=poll.start.bind(poll),nativeStop=poll.stop.bind(poll);poll.start=(...args)=>{window.pollStarts++;return nativeStart(...args);};poll.stop=(...args)=>{window.pollStops++;return nativeStop(...args);};const originalRequire=L.require.bind(L);L.require=(name,...args)=>name==="poll"?Promise.resolve(poll):originalRequire(name,...args);poll.stop();
  document.querySelector('#indicators [data-indicator="poll-status"]')?.remove();
  ui.showIndicator("poll-status","Paused",null,"inactive");
 });
 const poll=page.locator('#indicators [data-indicator="poll-status"]');
 await page.waitForFunction(()=>document.querySelector(".ml-poll-action")?.getAttribute("aria-label")==="恢复自动刷新");
 await poll.click();await page.waitForFunction(()=>pollStarts===1);assert.equal(await page.evaluate(()=>pollStarts),1);
 // Real LuCI polling and real indicator span, never a replacement handler.
 await page.evaluate(async()=>{window.testPollFn=()=>Promise.resolve();testPoll.add(testPollFn,30);});
 await page.waitForFunction(()=>document.querySelector(".ml-poll-action")?.getAttribute("aria-label")==="暂停自动刷新");
 assert.equal(await poll.getAttribute("aria-label"),"暂停自动刷新");
 assert((await poll.boundingBox()).height>=48);
 await page.evaluate(async()=>{const ui=await L.require("ui");ui.showIndicator("uci-changes","未保存更改",()=>{});});
 assert.equal(await page.locator('[data-indicator="uci-changes"]').getAttribute("role"),null);
 if(name==="chromium")await page.screenshot({path:"dist/previews/refresh-running.png"});
 await poll.click();await page.waitForFunction(()=>pollStops===2);assert.equal(await page.evaluate(()=>pollStops),2);
 await page.waitForFunction(()=>document.querySelector(".ml-poll-action").getAttribute("aria-label")==="恢复自动刷新");
 if(name==="chromium")await page.screenshot({path:"dist/previews/refresh-paused.png"});
 if(name==="chromium"){await poll.focus();assert.equal(await poll.evaluate(el=>document.activeElement===el),true,"poll action must be keyboard focusable");await poll.click();await page.waitForFunction(()=>pollStarts===2);assert.equal(await page.evaluate(()=>pollStarts),2);}
 // Same hit area and exactly one ripple, on text and chevron.
 await page.locator("#ml-menu-button").click();
 const parent=page.locator(".ml-nav-parent[aria-controls]").filter({hasText:"网络"});
 for(const child of [".ml-nav-parent-label",".ml-nav-chevron"]){
  await page.waitForTimeout(550);const before=await parent.getAttribute("aria-expanded");
  await parent.locator(child).click();
  assert.notEqual(await parent.getAttribute("aria-expanded"),before);
  assert.equal(await parent.locator(".tap-ripple").count(),1);
  assert.equal(await parent.locator("..").locator(":scope > .tap-ripple").count(),0);
 }
 assert.equal(await parent.getAttribute("data-ripple"),"control");
 assert.equal(await parent.locator(".ml-nav-chevron").evaluate(el=>getComputedStyle(el).backgroundColor),"rgba(0, 0, 0, 0)");
 await page.waitForTimeout(550);
 // A moved/cancelled pointer must leave no wave.
 await parent.dispatchEvent("pointerdown",{pointerId:8,isPrimary:true,button:0,clientX:40,clientY:200,pointerType:"touch"});
 await parent.dispatchEvent("pointercancel",{pointerId:8,isPrimary:true});
 await parent.dispatchEvent("pointerup",{pointerId:8,isPrimary:true,button:0,clientX:40,clientY:250,pointerType:"touch"});
 assert.equal(await parent.locator(".tap-ripple").count(),0);
 await page.keyboard.press("Escape");
 // Appearance settings open by default; desktop reflows and remains expanded.
 const appearance=page.locator("#ml-appearance-entry");
 assert(await appearance.evaluate(el=>el.open),"appearance settings should start expanded");
 assert.equal(await page.locator("#ml-appearance h2").allTextContents().then(xs=>xs.some(x=>x==="关于"||x==="About")),false);
 await appearance.scrollIntoViewIfNeeded();
 if(name==="chromium")await page.screenshot({path:"dist/previews/appearance-mobile.png"});
 await page.setViewportSize({width:1280,height:900});
 await page.waitForFunction(()=>document.querySelector("#ml-appearance-entry")?.open);
 assert.equal(await page.locator("#ml-appearance> .ml-group").evaluate(el=>getComputedStyle(el.parentElement).display),"grid");
 assert.equal(await page.locator("#ml-appearance-entry>summary").evaluate(el=>getComputedStyle(el).display),"none");
 assert.equal(await page.locator(".ml-mode-option").count(),3);
 const desktopBg=await page.locator(".ml-sidebar").evaluate(el=>getComputedStyle(el).backgroundColor);
 const canvasBg=await page.locator("body").evaluate(el=>getComputedStyle(el).backgroundColor);
 assert.equal(desktopBg,canvasBg,"desktop sidebar and content canvas should share one background");
 await appearance.scrollIntoViewIfNeeded();
 if(name==="chromium")await page.screenshot({path:"dist/previews/appearance-desktop.png"});
 await page.setViewportSize({width:390,height:844});
 // Assert official instance state, native events, external setters, reset and disposal.
 const flag=page.locator("#legacy-switch + .mdc-switch");
 await page.evaluate(()=>{window.fieldEvents={click:0,change:0};const input=document.getElementById("legacy-switch");for(const key of ["click","change"])input.addEventListener(key,()=>fieldEvents[key]++);});
 await flag.click();
 assert.deepEqual(await page.evaluate(()=>fieldEvents),{click:1,change:1});
 assert(await flag.evaluate(el=>!!el._mlMdcSwitch&&el._mlMdcSwitch.selected===document.getElementById("legacy-switch").checked));
 await page.evaluate(()=>{const el=document.getElementById("legacy-switch");el.checked=true;el.disabled=true;});
 assert.equal(await flag.getAttribute("aria-checked"),"true");assert(await flag.isDisabled());
 await page.evaluate(()=>{document.getElementById("legacy-switch").disabled=false;document.getElementById("fixture-form").reset();});
 await page.waitForTimeout(30);assert.equal(await flag.getAttribute("aria-checked"),"true");
 await page.evaluate(()=>{document.getElementById("legacy-switch").setAttribute("disabled","");});
 await page.waitForFunction(()=>document.querySelector("#legacy-switch + .mdc-switch").disabled);
 await page.evaluate(()=>document.getElementById("legacy-switch").removeAttribute("disabled"));
 await page.waitForFunction(()=>!document.querySelector("#legacy-switch + .mdc-switch").disabled);
 // Representative plugin DOM, explicitly simulated (not a claim of router coverage).
 await page.evaluate(()=>{
  const view=document.createElement("div");view.id="view";document.getElementById("maincontent").append(view);
  const section=document.createElement("section");section.className="cbi-section";section.id="rate-fixture";
  section.innerHTML='<h3>网速控制 · 模拟配置</h3><div class="cbi-value"><label class="cbi-value-title">启用网速控制</label><div class="cbi-value-field"><label><input class="cbi-input-checkbox" type="checkbox" name="rate_enabled"></label></div></div><div class="network-status-table"><div class="ifacebox"><div class="ifacebox-head">IPv4 上游</div><div class="ifacebox-body">WAN 已连接 <span class="ifacebadge">eth0</span></div></div></div>';
  view.append(section);
 });
 await page.waitForSelector("#rate-fixture .mdc-switch");
 const rate=page.locator("#rate-fixture .mdc-switch");await rate.click();
 assert.equal(await page.locator('#rate-fixture input').isChecked(),true,"label default double-toggled field");
 assert.equal(await rate.getAttribute("aria-checked"),"true");
 // Exercise the pinned LuCI load graph's inline-white wrapper in its route scope.
 await page.evaluate(()=>{
  document.body.dataset.page="admin-status-load";
  let view=document.getElementById("view");
  if(!view){view=document.createElement("div");view.id="view";document.getElementById("maincontent").append(view);}
  view.insertAdjacentHTML("afterbegin",'<div id="graph-fixture" style="width:100%;height:120px;border:1px solid #000;background:#fff"><svg><line style="stroke:black;stroke-width:1"/><text style="fill:#eee">Graph label</text></svg></div>');
 });
 const graph=page.locator("#graph-fixture");
 assert.equal(await graph.evaluate(el=>getComputedStyle(el).backgroundColor),"rgb(255, 255, 255)");
 assert.notEqual(await graph.evaluate(el=>getComputedStyle(el).borderTopColor),"rgb(0, 0, 0)");
 assert.notEqual(await graph.locator("line").evaluate(el=>getComputedStyle(el).stroke),"rgb(0, 0, 0)");
 if(name==="chromium")await page.screenshot({path:"dist/previews/realtime-chart-light.png"});
 for(const theme of ["light","dark"])for(const cards of [true,false]){
  await page.evaluate(({theme,cards})=>{MaterialAppearance.set("mode",theme);MaterialAppearance.set("cards",cards);}, {theme,cards});
  assert.equal(await page.locator("#maincontent").evaluate(el=>el.classList.contains("ml-card-surface")),false);
  assert.equal(await page.locator(".ml-card-surface .ml-card-surface").count(),0);
  assert.equal(await page.locator("#rate-fixture .ifacebadge").evaluate(el=>getComputedStyle(el).backgroundColor),"rgba(0, 0, 0, 0)");
  if(name==="chromium"&&cards){await page.locator("#rate-fixture").scrollIntoViewIfNeeded();await page.screenshot({path:"dist/previews/rate-"+theme+".png"});}
 }
 await page.evaluate(()=>{MaterialAppearance.set("toolbar",true);MaterialAppearance.set("cards",true);});
 assert.equal(await page.locator('meta[name="theme-color"]').count(),2);
 assert.equal(await page.locator('meta[name="apple-mobile-web-app-status-bar-style"]').count(),0);
 assert.deepEqual(await page.locator('meta[name="theme-color"]').evaluateAll(nodes=>nodes.map(n=>n.content)),["#FAFAFA","#121212"]);
 assert(!await page.locator('meta[name="viewport"]').getAttribute("content").then(v=>v.includes("viewport-fit=cover")));
 assert.equal(await page.locator(".ml-toolbar").evaluate(el=>el.getBoundingClientRect().height),56);
 const inventory=await page.locator('input[type="checkbox"]').evaluateAll(nodes=>nodes.map(input=>({
  name:input.name,converted:input.classList.contains("ml-switch-source"),
  instance:!!input.parentElement.querySelector(".mdc-switch")?._mlMdcSwitch,
  checked:input.checked,disabled:input.disabled
 })));
 fs.writeFileSync("dist/previews/switch-inventory-"+name+".json",JSON.stringify(inventory,null,2));
 assert(inventory.every(item=>!item.converted||item.instance),"converted checkbox lacks MDC instance");

 // Keep preview loading at the content area's upper edge, without unrelated
 // sample sections. Removing controls also exercises instance disposal.
 await page.evaluate(()=>{
  window.disposedSwitch=document.querySelector("#legacy-switch + .mdc-switch");
  const view=document.getElementById("view");document.getElementById("maincontent").replaceChildren(view);
  scrollTo(0,0);
 });
 await page.waitForFunction(()=>!disposedSwitch._mlMdcSwitch);
 // Use the actual pinned LuCI View.__init__ lifecycle with controlled data.
 await page.evaluate(async()=>{
  window.fixtureViewClass=await L.require("view");
  window.fixtureReady=new Promise(resolve=>window.resolveView=resolve);
  window.fixtureViewPromise=fixtureViewClass.prototype.__init__.call({
   load:()=>fixtureReady,render:()=>E("section",{class:"cbi-section"},[E("h3","状态视图已载入"),E("p","模拟网络数据")]),addFooter:()=>null
  });
 });
 await page.waitForSelector("#view > .ml-progress-host .ml-task-progress");
 assert.equal(await page.locator("#view > .spinning").count(),1);
 const progress=page.locator("#view .mdc-linear-progress__primary-bar");
 await progress.scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>{const el=document.querySelector("#view .mdc-linear-progress__primary-bar");return el?.getAnimations().some(a=>typeof a.currentTime==="number"&&a.playState==="running");});
 const start=await progress.evaluate(el=>el.getAnimations()[0]?.currentTime);
 await page.waitForTimeout(160);assert(await progress.evaluate((el,t)=>el.getAnimations()[0]?.currentTime>t,start),"body progress animation frozen");
 if(name==="chromium")await page.screenshot({path:"dist/previews/status-loading.png"});
 await page.evaluate(()=>resolveView());await page.waitForSelector("#view > .spinning",{state:"detached"});
 assert.equal(await page.locator("#view .ml-task-progress").count(),0);
 if(name==="chromium")await page.screenshot({path:"dist/previews/status-loaded.png"});
 await page.evaluate(()=>{
  window.fixtureFail=new Promise((resolve,reject)=>window.rejectView=reject);
  window.fixtureFailedPromise=fixtureViewClass.prototype.__init__.call({
   load:()=>fixtureFail,render:()=>E("p","unexpected"),addFooter:()=>null
  }).catch(e=>{window.expectedViewError=e.message;});
 });
 await page.waitForSelector("#view .ml-task-progress");
 await page.evaluate(()=>rejectView(new Error("模拟载入失败")));
 await page.waitForSelector("#view .ml-task-progress",{state:"detached"});
 assert(await page.locator("#view [role=alert]").textContent().then(v=>v.includes("失败")));
 await page.evaluate(async()=>{await fixtureFailedPromise;document.getElementById("view").replaceChildren();});
 assert.equal(await page.locator(".ml-task-progress").count(),0);

 // Resource URLs come from the freshly built package, with a cache suffix.
 const urls=await page.locator('script[src*="/materialluci/"],link[href*="/materialluci/"]').evaluateAll(nodes=>nodes.map(el=>el.src||el.href));
 assert(urls.every(url=>new URL(url).searchParams.has("v")));
 assert.equal(errors.length,0,errors.join("\n"));
 await page.close();
}
