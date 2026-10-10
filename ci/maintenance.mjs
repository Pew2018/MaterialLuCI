import assert from "node:assert/strict";
export async function verifyMaintenance(browser,name,base){
 for(const kind of ["reboot","flash","firewall"]){
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto(base+"/"+kind+".html");
  await page.waitForSelector(kind==="reboot"?"#view>button":kind==="flash"?'.cbi-value[data-name="dl_backup"] button':'#view [data-chain] table');
  await page.waitForFunction(()=>!!window.MaterialLuCI);
  // Allow the mutation-enhancement frame to run; assert real rendered groups.
  await page.waitForFunction(kind=>kind==="reboot"?document.querySelector("#view.ml-card-surface"):kind==="flash"?document.querySelectorAll(".ml-section-container .cbi-section.ml-card-surface").length===4:document.querySelectorAll("#view [data-table].ml-card-surface").length===2,kind);
  assert.equal(await page.locator(".ml-card-surface .ml-card-surface").count(),0);
  if(kind==="reboot"){
   assert.equal(await page.locator("#view>hr").evaluate(el=>getComputedStyle(el).display),"none");
   assert.equal(await page.locator("#view>.alert-message.warning").count(),1,"reboot warning preserved");
   await page.locator("#view>button").click();
   assert.deepEqual(await page.evaluate(()=>maintenanceCalls),["Perform reboot"]);
  }else if(kind==="firewall"){
   const contracts=await page.evaluate(()=>{
    const first=firewallPreview.createChainSection(false,'Filter','INPUT','ACCEPT',10,128);
    firewallPreview.updateChainSection(first,[]);
    return {table:first.tagName,heading:first.previousElementSibling.tagName,chain:first.parentNode.dataset.chain};
   });
   assert.deepEqual(contracts,{table:"TABLE",heading:"H4",chain:"INPUT"},"firewall polling and jump contracts");
  }else{
   const buttons=page.locator('.ml-section-container .cbi-value-field button.cbi-button');
   const first=buttons.first();await first.click();
   assert.deepEqual(await page.evaluate(()=>maintenanceCalls),["Generate archive"]);
   // Full-width section wrappers must not consume a form label column.
   assert(await page.locator(".ml-section-container").evaluateAll(xs=>xs.every(el=>getComputedStyle(el).display==="block")));
   const boxes=await buttons.evaluateAll(xs=>xs.map(el=>({x:el.getBoundingClientRect().x,h:el.getBoundingClientRect().height,r:getComputedStyle(el).borderRadius})));
   assert(boxes.length>=5);
   assert(boxes.every(x=>x.h===48&&x.r==="2px"),"backup/reset/upload/download button geometry");
   assert(boxes.every(x=>Math.abs(x.x-boxes[0].x)<1),"backup action column alignment");
  }
  for(const width of [390,1280])for(const mode of ["light","dark"]){
   await page.setViewportSize({width,height:900});
   await page.evaluate(mode=>MaterialAppearance.set("mode",mode),mode);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"maintenance overflow");
   await page.screenshot({path:"dist/previews/"+name+"-"+kind+"-"+width+"-"+mode+".png",fullPage:true});
  }
  await page.evaluate(()=>MaterialAppearance.set("cards",false));
  assert(await page.locator(".ml-card-surface").evaluateAll(xs=>xs.every(el=>getComputedStyle(el).boxShadow==="none")));
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log(name+": actual reboot/flash renderers, warning preservation, native callbacks, complete cards and action alignment passed");
}
