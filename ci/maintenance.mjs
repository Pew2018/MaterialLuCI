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
   // Compatibility fixture matching the documented legacy Lua shape:
   // h2/p/hr and an input button directly under maincontent, with no #view.
   const legacy=await browser.newPage({viewport:{width:390,height:844}}),legacyErrors=[];
   legacy.on("pageerror",e=>legacyErrors.push(e.message));
   await legacy.goto(base+"/reboot.html");
   await legacy.waitForFunction(()=>!!window.MaterialLuCI);
   await legacy.evaluate(()=>{
    const main=document.getElementById("maincontent");
    window.L.env.dispatchpath=[];window.L.env.requestpath=[];
    document.body.dataset.page="admin-system-reboot";
    const title=document.createElement("h2");title.textContent="Reboot";
    const description=document.createElement("p");description.textContent="Restart the device and reconnect after it becomes available.";
    const rule=document.createElement("hr"),form=document.createElement("form"),action=document.createElement("input");
    action.type="button";action.id="legacy-reboot-action";action.name="reboot";action.value="Perform reboot";action.className="cbi-button cbi-button-action important";
    action.addEventListener("click",()=>window.legacyCalls=(window.legacyCalls||0)+1);
    form.append(action);main.replaceChildren(title,description,rule,form);
    MaterialLuCI.enhance(main);
   });
   const legacyLayout=await legacy.evaluate(()=>{const main=document.getElementById("maincontent");return {page:main.dataset.mlPage,route:document.body.dataset.page,card:main.classList.contains("ml-card-surface"),children:[...main.children].map(el=>el.tagName.toLowerCase()),view:!!main.querySelector("#view")};});
   assert.equal(legacyLayout.card,true,"legacy reboot surface: "+JSON.stringify(legacyLayout));
   assert.equal(await legacy.locator("#maincontent").getAttribute("data-ml-page"),"reboot","legacy data-page route fallback");
   assert.equal(await legacy.locator("#maincontent hr").evaluate(el=>getComputedStyle(el).display),"none");
   assert.equal(await legacy.locator("#legacy-reboot-action").getAttribute("name"),"reboot");
   assert.equal(await legacy.locator("#legacy-reboot-action").evaluate(el=>getComputedStyle(el).textAlign),"center");
   assert.equal(await legacy.locator("#legacy-reboot-action").evaluate(el=>getComputedStyle(el).borderTopColor),"rgba(0, 0, 0, 0)");
   await legacy.locator("#legacy-reboot-action").click();
   assert.equal(await legacy.evaluate(()=>legacyCalls),1,"legacy reboot click callback preserved");
   for(const width of [390,1280])for(const mode of ["light","dark"]){
    await legacy.setViewportSize({width,height:844});
    await legacy.evaluate(mode=>MaterialAppearance.set("mode",mode),mode);
    assert(await legacy.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"legacy reboot overflow");
    await legacy.screenshot({path:"dist/previews/"+name+"-reboot-legacy-"+width+"-"+mode+".png",fullPage:true});
   }
   assert.deepEqual(legacyErrors,[]);
   await legacy.close();
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
   const picker=page.locator('input[type="file"]');
   if(await picker.count()){
    const rect=await picker.first().boundingBox(),style=await picker.first().evaluate(el=>({color:getComputedStyle(el).color,border:getComputedStyle(el).borderBottomWidth}));
    assert(rect.width>0&&rect.height>0&&rect.x+rect.width<=innerWidth,"native restore file picker remains in bounds");
    assert.equal(style.color,await page.locator("#maincontent").evaluate(el=>getComputedStyle(el).color));
    assert.equal(style.border,"0px","file picker is not styled as a text field");
   }
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
