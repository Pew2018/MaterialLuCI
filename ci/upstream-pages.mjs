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
  const address=page.url();const expanded=await parent.getAttribute("aria-expanded");
  await parent.click();
  assert.notEqual(await parent.getAttribute("aria-expanded"),expanded);assert.equal(page.url(),address);
  await page.screenshot({path:"dist/previews/"+name+"-"+size+"-upstream-sidebar.png"});
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
