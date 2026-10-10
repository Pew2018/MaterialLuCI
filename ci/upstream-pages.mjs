import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
export async function verifyUpstreamPages(browser,name,base){
 for(const [size,viewport] of [["mobile",{width:390,height:844}],["desktop",{width:1280,height:900}]]){
  const page=await browser.newPage({viewport}),errors=[];
  page.on("pageerror",e=>{errors.push(e.message);console.error(name,size,e.message);});
  page.on("console",msg=>{if(msg.type()==="error")console.error("browser:",msg.text());});
  let release;
  await page.route("**/preview-ready",r=>{release=()=>r.fulfill({status:200,body:"ready"});});
  await page.goto(base+"/upstream.html");
  await page.waitForSelector("#view > .spinning");
  await page.waitForSelector(".ml-view-progress .mdc-linear-progress");
  assert.equal(await page.locator(".ml-view-progress").count(),1);
  const bar=page.locator(".ml-view-progress .mdc-linear-progress__primary-bar");
  await page.waitForFunction(()=>document.querySelector(".ml-view-progress .mdc-linear-progress__primary-bar")?.getAnimations().some(a=>a.playState==="running"));
  const before=await bar.evaluate(el=>el.getAnimations()[0].currentTime);
  await page.waitForTimeout(180);
  assert(await bar.evaluate((el,t)=>el.getAnimations()[0].currentTime>t,before));
  await page.screenshot({path:"dist/previews/"+name+"-"+size+"-upstream-loading.png"});
  await release();
  try{await page.waitForSelector("#upstream-wireless .assoclist");}catch(e){console.error(await page.locator("#maincontent").innerText());throw e;}
  await page.waitForSelector("#ml-appearance-entry[open]");
  await page.waitForSelector(".ml-view-progress",{state:"detached"});
  assert.equal(await page.locator("#ml-appearance h2").allTextContents().then(x=>x.includes("关于")||x.includes("About")),false);
  assert.equal(await page.locator("#ml-appearance-entry").evaluate(el=>el.open),true);
  await page.locator("#ml-appearance-entry").scrollIntoViewIfNeeded();
  await page.screenshot({path:"dist/previews/"+name+"-"+size+"-upstream-settings.png"});
  // Use real LuCI form widgets, not replacement test inputs.
  await page.waitForFunction(()=>document.querySelector('input[id$=".hostname"]')?.closest(".ml-text-field")?._mlMdcTextField);
  const field=page.locator('input[id$=".hostname"]');
  assert(await field.evaluate(el=>!!el.closest(".ml-text-field")._mlMdcTextField));
  await field.evaluate(el=>{window.textFieldChanges=0;el.addEventListener("change",()=>window.textFieldChanges++);});
  await field.fill("router-draft");await field.press("Tab");
  assert.equal(await page.evaluate(()=>textFieldChanges),1);
  assert.equal(await page.evaluate(()=>previewName.formvalue("theme")),"router-draft");
  await page.evaluate(()=>previewName.getUIElement("theme").setValue("router-external"));
  assert.equal(await field.inputValue(),"router-external");
  await field.focus();
  await page.waitForFunction(()=>document.querySelector('input[id$=".hostname"]').closest(".ml-text-field").querySelector(".mdc-line-ripple").classList.contains("mdc-line-ripple--active"));
  const textarea=page.locator("textarea");
  assert(await textarea.evaluate(el=>el.parentElement.firstElementChild===el&&!!el.parentElement._mlMdcTextField));
  await page.evaluate(()=>previewTextarea.getUIElement("theme").setValue("retained notes"));
  assert.equal(await textarea.inputValue(),"retained notes");
  assert.equal(await page.evaluate(()=>previewTextarea.formvalue("theme")),"retained notes");
  const password=page.locator('input[id$=".password"]');
  const reveal=password.locator("..").locator("button");
  assert(await password.evaluate(el=>el.nextElementSibling.tagName==="BUTTON"));
  await reveal.click();assert.equal(await password.getAttribute("type"),"text");
  await reveal.click();assert.equal(await password.getAttribute("type"),"password");
  await field.evaluate(el=>el.disabled=true);
  assert(await field.evaluate(el=>el.closest(".ml-text-field").classList.contains("mdc-text-field--disabled")));
  await field.evaluate(el=>{el.disabled=false;el.readOnly=true;});
  assert(await field.evaluate(el=>el.readOnly));
  await field.evaluate(el=>{el.readOnly=false;el.setAttribute("aria-invalid","true");});
  await page.waitForFunction(()=>document.querySelector('input[id$=".hostname"]').closest(".ml-text-field").classList.contains("mdc-text-field--invalid"));
  await field.evaluate(el=>el.setAttribute("aria-invalid","false"));
  await field.scrollIntoViewIfNeeded();
  await page.screenshot({path:"dist/previews/"+name+"-"+size+"-mdc-textfields.png"});
  const listInput=page.locator(".cbi-dynlist .add-item > input");
  await listInput.fill("192.0.2.2");
  await page.locator(".cbi-dynlist .cbi-button-add").click();
  assert.deepEqual(await page.evaluate(()=>previewList.formvalue("theme")),["192.0.2.1","192.0.2.2"]);
  await listInput.fill("192.0.2.3");await listInput.press("Enter");
  assert.deepEqual(await page.evaluate(()=>previewList.formvalue("theme")),["192.0.2.1","192.0.2.2","192.0.2.3"]);
  const reset=page.getByRole("button",{name:"执行重置",exact:true});
  await reset.scrollIntoViewIfNeeded();
  assert((await reset.boundingBox()).height>=48);
  assert.equal(await reset.evaluate(el=>getComputedStyle(el).borderRadius),"2px");
  assert.equal(await reset.evaluate(el=>getComputedStyle(el).borderTopColor),"rgba(0, 0, 0, 0)");
  await reset.click();assert.equal(await page.evaluate(()=>resetPreviewClicks),1);
  await page.screenshot({path:"dist/previews/"+name+"-"+size+"-reset-button.png"});
  for(const width of [320,390,768,1024,1280,1600]){
   await page.setViewportSize({width,height:900});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"appearance overflow "+width);
   assert(await page.locator("#ml-appearance-entry").evaluate(el=>el.open));
   const layout=await page.locator("#ml-appearance").evaluate(el=>getComputedStyle(el).display);
   assert.equal(layout,width>=1024?"grid":"block");
   assert.equal(await page.locator("#ml-appearance").evaluate(el=>getComputedStyle(el).fontFamily),await field.evaluate(el=>getComputedStyle(el).fontFamily));
   if(width>=1024){
    const general=await page.locator('[data-group=general] h2').boundingBox(),ranges=await page.locator('[data-group=ranges] h2').boundingBox();
    assert(Math.abs(general.y-ranges.y)<1,"first setting headings misaligned");
    const oneplus=await page.locator('[data-group=oneplus] h2').boundingBox(),material=await page.locator('[data-group=material] h2').boundingBox();
    assert(Math.abs(oneplus.y-material.y)<1,"palette headings misaligned");
   }
  }
  await page.setViewportSize(viewport);
  for(const mode of ["light","dark"]){
   await page.evaluate(v=>MaterialAppearance.set("mode",v),mode);
   assert.equal(await field.evaluate(el=>getComputedStyle(el.closest(".ml-text-field")).backgroundColor),"rgba(0, 0, 0, 0)","MDC default filled color must not override the MD1 surface");
   const ink=await page.locator("#maincontent").evaluate(el=>getComputedStyle(el).color);
   for(const input of [field,password,textarea,listInput]){
    assert.equal(await input.evaluate(el=>getComputedStyle(el).color),ink,"input ink in "+mode);
    assert.equal(await input.evaluate(el=>getComputedStyle(el).webkitTextFillColor),ink,"WebKit input ink in "+mode);
    const state=await input.evaluate(el=>{
     el.placeholder="Default value";const s=getComputedStyle(el,"::placeholder");
     return {color:s.color,fill:s.webkitTextFillColor,opacity:s.opacity};
    });
    const muted=await page.evaluate(()=>{const p=document.createElement("span");p.style.color="var(--muted)";document.body.append(p);const c=getComputedStyle(p).color;p.remove();return c;});
    assert.equal(state.color,muted,"placeholder color in "+mode);
    assert.equal(state.fill,muted,"WebKit placeholder fill in "+mode);
    assert.equal(state.opacity,"1");
   }
   await field.evaluate(el=>el.disabled=true);
   const disabled=await page.evaluate(()=>{const p=document.createElement("span");p.style.color="var(--disabled)";document.body.append(p);const c=getComputedStyle(p).color;p.remove();return c;});
   assert.equal(await field.evaluate(el=>getComputedStyle(el).color),disabled);
   assert.equal(await field.evaluate(el=>getComputedStyle(el).webkitTextFillColor),disabled);
   await field.evaluate(el=>el.disabled=false);
   if(size==="desktop"){
    for(const suffix of ["lang","_mediaurlbase"]){
     const row=page.locator('.cbi-value[data-field$=".'+suffix+'"]');
     const label=await row.locator(".cbi-value-title").boundingBox(),anchor=await row.locator(".mdc-select__anchor").boundingBox();
     assert(Math.abs(label.y+label.height/2-anchor.y-anchor.height/2)<1,"language/design label center");
    }
   }
   await field.scrollIntoViewIfNeeded();
   await page.screenshot({path:"dist/previews/"+name+"-"+size+"-mdc-textfields-"+mode+".png"});
   await reset.scrollIntoViewIfNeeded();
   await page.screenshot({path:"dist/previews/"+name+"-"+size+"-reset-button-"+mode+".png"});
  }
  await page.evaluate(()=>MaterialAppearance.set("mode","light"));
  // Match bytes served by the test HTTP server to the manifest IN the IPK.
  const identity=await (await page.request.get(base+"/luci-static/materialluci/build.json")).json();
  assert.equal(identity.commit,process.env.GITHUB_SHA);
  const responses=[];
  for(const [path,hash] of Object.entries(identity.files)){
   if(!path.startsWith("www/"))continue;
   const url=base+"/"+path.slice(4)+"?v="+identity.cache;
   const response=await page.request.get(url);
   assert(response.ok(),url);
   const digest=crypto.createHash("sha256").update(await response.body()).digest("hex");
   assert.equal(digest,hash,path);
   responses.push({url,sha256:digest});
  }
  fs.writeFileSync("dist/previews/resources-"+name+"-"+size+".json",JSON.stringify({commit:identity.commit,responses},null,2));
  const flag=page.locator('input[type=checkbox].ml-switch-source').first();
  const control=flag.locator("..").locator(".mdc-switch").first();
  await control.scrollIntoViewIfNeeded();
  await flag.evaluate(el=>{window.changes=0;el.addEventListener("change",()=>window.changes++);});
  const checked=await flag.isChecked();await control.click();
  assert.equal(await flag.isChecked(),!checked);assert.equal(await page.evaluate(()=>window.changes),1);
  assert(await control.evaluate(el=>!!el._mlMdcSwitch));
  await page.screenshot({path:"dist/previews/"+name+"-"+size+"-upstream-switch.png"});
  if(size==="mobile")await page.locator("#ml-menu-button").click();
  const parent=page.locator(".ml-nav-parent").filter({hasText:"网络"});
  assert.equal(await page.locator(".ml-nav-entry-link").count(),0);
  const address=page.url();const expanded=await parent.getAttribute("aria-expanded");
  await parent.click();
  assert.notEqual(await parent.getAttribute("aria-expanded"),expanded);assert.equal(page.url(),address);
  await page.screenshot({path:"dist/previews/"+name+"-"+size+"-upstream-sidebar.png"});
  for(const title of ["系统","服务","网络","状态"]){
   const toggle=page.locator("button.ml-nav-parent").filter({hasText:title});
   await toggle.click();
   assert((await page.locator('button.ml-nav-parent[aria-expanded=true]').count())<=1);
   await toggle.focus();await page.keyboard.press("Enter");
   assert((await page.locator('button.ml-nav-parent[aria-expanded=true]').count())<=1);
   assert.equal(page.url(),address);
   const ink=await page.locator("#maincontent").evaluate(el=>getComputedStyle(el).color);
   const closed=await page.locator('button.ml-nav-parent[aria-expanded=false]').evaluateAll(xs=>xs.map(el=>getComputedStyle(el).color));
   assert(closed.every(color=>color===ink),"MDC button default colored a collapsed parent");
  }
  await parent.click();
  if(size==="mobile")await page.keyboard.press("Escape");
  await page.evaluate(async()=>{const ui=await L.require("ui");ui.showIndicator("poll-status","Paused",null,"inactive");});
  await page.waitForSelector(".ml-poll-action");
  assert((await page.locator(".ml-poll-action").boundingBox()).height>=48);
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:"dist/previews/"+name+"-"+size+"-upstream-refresh.png"});
  for(const mode of ["light","dark"])for(const cards of [true,false]){
   await page.evaluate(({mode,cards})=>{MaterialAppearance.set("mode",mode);MaterialAppearance.set("cards",cards);},{mode,cards});
   const neutral=mode==="dark"?"#121212":"#FAFAFA";
   for(const toolbar of [false,true]){
    await page.evaluate(v=>MaterialAppearance.set("toolbar",v),toolbar);
    assert.equal(await page.locator('meta[name=theme-color]').getAttribute("content"),neutral);
   }
   await page.locator("#upstream-network").scrollIntoViewIfNeeded();
   await page.screenshot({path:"dist/previews/"+name+"-"+size+"-ipv4-"+mode+"-cards-"+cards+".png"});
   await page.locator("#upstream-wireless").scrollIntoViewIfNeeded();
   await page.screenshot({path:"dist/previews/"+name+"-"+size+"-wireless-"+mode+"-cards-"+cards+".png"});
   assert.equal(await page.locator(".ml-card-surface .ml-card-surface").count(),0);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.goto(base+"/realtime.html");
  await page.waitForSelector(".ml-chart-surface svg");
  for(const mode of ["light","dark"]){
   await page.evaluate(v=>MaterialAppearance.set("mode",v),mode);
   await page.screenshot({path:"dist/previews/"+name+"-"+size+"-upstream-realtime-"+mode+".png"});
   assert.notEqual(await page.locator(".ml-chart-surface svg text").first().evaluate(el=>getComputedStyle(el).fill),"rgb(238, 238, 238)");
  }
  assert.equal(errors.length,0,errors.join("\n"));
  await page.close();
 }
 console.log(name+": upstream renderers with mocked read-only data passed; real router and iPhone pending");
}
