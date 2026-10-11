import assert from "node:assert/strict";

export async function verifyLegacyFlash(browser,name,base){
 for(const variant of ["available","limited"]){
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  // No request from an operation may reach even the local preview handler.
  await page.route("**/cgi-bin/luci/admin/system/flashops/**",route=>route.abort());
  await page.goto(base+"/flashops-legacy-"+variant+".html");
  await page.waitForFunction(()=>document.querySelectorAll(".ml-legacy-card-start").length===2);
  await page.evaluate(()=>{
   MaterialAppearance.set("seed","#009688");MaterialAppearance.set("toolbar",true);
   window.flashSubmits=[];window.flashConfirms=0;
   window.confirm=()=>{flashConfirms++;return true;};
   document.querySelectorAll("#maincontent form").forEach(form=>form.addEventListener("submit",event=>{
    event.preventDefault();flashSubmits.push({action:form.getAttribute("action"),method:form.method,enctype:form.enctype,entries:[...new FormData(form,event.submitter).entries()].map(([key,value])=>[key,typeof value==="string"?value:value.name])});
   }));
  });
  const contract=await page.evaluate(()=>[...document.querySelectorAll("#maincontent form")].map(form=>({action:form.getAttribute("action"),method:form.method,enctype:form.enctype,nodes:[...form.querySelectorAll("input")].map(el=>({id:el.id,name:el.name,type:el.type,value:el.type==="file"?"":el.value,handler:el.getAttribute("onclick")}))})));
  assert.equal(contract.length,variant==="available"?4:2);
  assert(contract.every(form=>form.method==="post"),"legacy form methods preserved");
  assert.equal(await page.locator("#maincontent .ml-card-surface .ml-card-surface").count(),0);
  assert.equal(await page.locator(".ml-legacy-flash-section.ml-card-surface").count(),0,"Backup and Restore must not share a giant outer card");
  assert.equal(await page.locator("#maincontent .cbi-section-error").count(),variant==="available"?2:0,"conditional original errors preserved");
  for(const width of [390,1280])for(const mode of ["light","dark"]){
   await page.setViewportSize({width,height:900});await page.evaluate(mode=>MaterialAppearance.set("mode",mode),mode);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"legacy flash overflow");
   const groups=await page.locator(".ml-legacy-flash-section").evaluate(el=>[...el.children].map(child=>({class:child.className,bg:getComputedStyle(child).backgroundColor,x:child.getBoundingClientRect().x,width:child.getBoundingClientRect().width})));
   const expected=await page.evaluate(()=>{const p=document.createElement("span");p.style.backgroundColor="var(--card)";document.body.append(p);const c=getComputedStyle(p).backgroundColor;p.remove();return c;});
   assert(groups.every(el=>el.bg===expected),"each original group segment paints a complete card");
   assert(groups.every(el=>Math.abs(el.x-groups[0].x)<1&&Math.abs(el.width-groups[0].width)<1),"legacy card boundaries align");
   const buttons=await page.locator("#maincontent input[type=submit]").evaluateAll(xs=>xs.map(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {h:r.height,radius:s.borderRadius,border:s.borderTopColor,align:s.textAlign,right:r.right,color:s.color,fill:s.webkitTextFillColor};}));
   assert(buttons.every(el=>el.h>=48&&el.radius==="2px"&&el.border==="rgba(0, 0, 0, 0)"&&el.align==="center"&&el.right<=width),"legacy submit geometry and no blue border: "+JSON.stringify(buttons));
   assert(buttons.every(el=>el.color===el.fill),"native button ink channels agree");
   const files=page.locator("#maincontent input[type=file]");
   for(let i=0;i<await files.count();i++){
    const geometry=await files.nth(i).evaluate(el=>{const r=el.getBoundingClientRect(),button=el.nextElementSibling,b=button.getBoundingClientRect(),s=getComputedStyle(el);return {right:r.right,width:r.width,buttonRight:b.right,separated:r.right<=b.x+1||r.bottom<=b.y+1,border:s.borderTopWidth};});
    assert(geometry.width>0&&geometry.right<=width&&geometry.buttonRight<=width&&geometry.separated,"native file/action separation: "+JSON.stringify(geometry));
    assert.equal(geometry.border,"0px");
   }
   await page.screenshot({path:"dist/previews/"+name+"-flashops-legacy-"+variant+"-"+width+"-"+mode+".png",fullPage:true});
  }
  // Each ORIGINAL submit control travels through its ORIGINAL form. Spy at
  // the submit boundary; never invoke backup/reset/restore/upgrade services.
  for(const submit of await page.locator("#maincontent input[type=submit]").all())await submit.click();
  const calls=await page.evaluate(()=>flashSubmits);
  assert.equal(calls.length,variant==="available"?4:2);
  assert(calls.some(x=>x.action.endsWith("/backup")&&x.entries.some(([k])=>k==="backup")));
  assert(calls.some(x=>x.action.endsWith("/restore")&&x.enctype==="multipart/form-data"&&x.entries.some(([k])=>k==="archive")));
  if(variant==="available"){
   assert.equal(await page.evaluate(()=>flashConfirms),1,"original reset confirmation preserved");
   assert(calls.some(x=>x.action.endsWith("/sysupgrade")&&x.entries.some(([k,v])=>k==="keep"&&v==="on")));
   assert.equal(await page.locator("#keep").isChecked(),true);
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 for(const variant of ["keep","erase"]){
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/cgi-bin/luci/admin/system/flashops",route=>route.abort());
  await page.goto(base+"/upgrade-legacy-"+variant+".html");
  await page.waitForFunction(()=>!!window.MaterialLuCI);
  await page.evaluate(()=>{
   MaterialAppearance.set("seed","#009688");window.upgradeSubmits=[];
   document.querySelector("#maincontent form").addEventListener("submit",event=>{event.preventDefault();upgradeSubmits.push([...new FormData(event.target,event.submitter).entries()]);});
  });
  assert.equal(await page.locator('#maincontent input[name=step]').inputValue(),"2");
  assert.equal(await page.locator('#maincontent input[name=keep]').inputValue(),variant==="keep"?"1":"");
  assert((await page.locator("#maincontent").innerText()).includes("fixture-sha256"),"checksum text preserved");
  assert((await page.locator("#maincontent").innerText()).includes("2048 bytes"),"size text preserved");
  assert.equal(await page.locator("#maincontent .error").count(),1,"oversized-image warning preserved");
  assert.equal(await page.locator(".ml-card-surface .ml-card-surface").count(),0);
  for(const width of [390,1280])for(const mode of ["light","dark"]){
   await page.setViewportSize({width,height:900});await page.evaluate(mode=>MaterialAppearance.set("mode",mode),mode);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"legacy confirmation overflow");
   const style=await page.locator("#maincontent input[type=submit]").evaluateAll(xs=>xs.map(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {height:r.height,border:s.borderTopColor,right:r.right};}));
   assert(style.every(x=>x.height>=48&&x.border==="rgba(0, 0, 0, 0)"&&x.right<=width),"legacy confirmation button geometry");
   await page.screenshot({path:"dist/previews/"+name+"-upgrade-legacy-"+variant+"-"+width+"-"+mode+".png",fullPage:true});
  }
  for(const submit of await page.locator("#maincontent input[type=submit]").all())await submit.click();
  const calls=await page.evaluate(()=>upgradeSubmits);
  assert.equal(calls.length,2,"both original submit paths preserved");
  assert(calls.every(entries=>entries.some(([k,v])=>k==="step"&&v==="2")));
  assert(calls[0].some(([k])=>k==="cancel"),"Cancel submitter name preserved");
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log(name+": verbatim Lua flashops, independent forms, multipart files, warnings, conditions and submit spies passed");
}
