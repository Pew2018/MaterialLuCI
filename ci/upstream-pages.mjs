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
  const textarea=page.locator("textarea.cbi-input-textarea");
  assert(await textarea.evaluate(el=>el.parentElement.firstElementChild===el&&!!el.parentElement._mlMdcTextField));
  await page.evaluate(()=>previewTextarea.getUIElement("theme").setValue("retained notes"));
  assert.equal(await textarea.inputValue(),"retained notes");
  assert.equal(await page.evaluate(()=>previewTextarea.formvalue("theme")),"retained notes");
  const password=page.locator('input[id$=".password"]');
  const reveal=password.locator("..").locator("button");
  assert(await password.evaluate(el=>el.nextElementSibling.tagName==="BUTTON"));
  assert((await reveal.boundingBox()).width<=64,"password reveal must remain an icon-sized auxiliary control");
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
  const auditBaseline=await page.evaluate(()=>{
   const host=document.createElement("section");host.className="ml-control-audit";host.id="ml-control-audit";
   const form=document.createElement("form");form.id="audit-form";form.addEventListener("submit",event=>{event.preventDefault();window.auditSubmits=(window.auditSubmits||0)+1;});
   const controls=[];
   for(const type of ["","text","password","number","email","url","tel","search"]){
    const input=document.createElement("input");if(type)input.type=type;input.id="audit-"+(type||"implicit");input.name=input.id;input.placeholder="Placeholder text";input.value=type==="number"?"42":"Existing value";form.append(input);controls.push(input);
   }
   const area=document.createElement("textarea");area.id="audit-textarea";area.name=area.id;area.value="Existing notes";area.placeholder="Textarea placeholder";form.append(area);controls.push(area);
   const select=document.createElement("select");select.id="audit-select";select.name=select.id;select.add(new Option("Selected value","selected"));form.append(select);
   const file=document.createElement("input");file.type="file";file.id="audit-file";form.append(file);
   const button=document.createElement("button");button.type="button";button.id="audit-button";button.className="cbi-button";button.style.width="176px";const label=document.createElement("span");label.textContent="一个需要换行的 English action label";button.append(label);form.append(button);
   const submit=document.createElement("input");submit.type="submit";submit.id="audit-submit";submit.className="cbi-button cbi-button-apply";submit.value="提交";form.append(submit);
   const reset=document.createElement("input");reset.type="reset";reset.id="audit-reset";reset.className="cbi-button";reset.value="重置";
   const actions=document.createElement("div");actions.className="cbi-page-actions";actions.append(submit,reset);form.append(actions);
   const link=document.createElement("a");link.href="#";link.className="btn";link.id="audit-link";link.textContent="链接操作";form.append(link);
   const div=document.createElement("div");div.className="btn";div.id="audit-div-button";div.textContent="旧式 div.btn";form.append(div);
   host.append(form);document.getElementById("maincontent").append(host);
   const bareColor=getComputedStyle(controls[0]).color;
   MaterialLuCI.enhance(host);
   window.auditActions=0;button.addEventListener("click",()=>window.auditActions++);
   return {bareColor,ink:getComputedStyle(document.querySelector("#maincontent")).color,count:controls.length};
  });
  assert.equal(auditBaseline.bareColor,auditBaseline.ink,"unwrapped implicit text input has theme ink before MDC enhancement");
  await page.waitForFunction(()=>document.querySelectorAll("#ml-control-audit .ml-text-field").length===9&&document.querySelector("#audit-select + .ml-mdc-select"));
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
    if(name==="chromium"){
     assert.equal(state.color,muted,"placeholder color in "+mode);
     assert.equal(state.fill,muted,"placeholder fill in "+mode);
     assert.equal(state.opacity,"1");
    }else{
     // WebKit getComputedStyle(::placeholder) returns the input style in
     // this engine. Verify painted glyph pixels instead of that fallback.
     const saved=await input.evaluate(el=>{const value=el.value;el.value="";el.blur();return value;});
     const bytes=await input.screenshot({animations:"disabled"});
     await input.evaluate((el,value)=>{el.value=value;},saved);
     const painted=await page.evaluate(async({data,mode})=>{
      const img=new Image();img.src=data;await img.decode();
      const canvas=document.createElement("canvas");canvas.width=img.width;canvas.height=img.height;
      const ctx=canvas.getContext("2d");ctx.drawImage(img,0,0);
      const pixels=ctx.getImageData(0,0,img.width,img.height).data,levels=[];
      const background=mode==="dark"?30:255;
      for(let y=4;y<img.height-4;y++)for(let x=2;x<img.width-2;x++){
       const i=(y*img.width+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];
       if(Math.abs(r-g)<4&&Math.abs(g-b)<4&&Math.abs(r-background)>20)levels.push(r);
      }
      if(!levels.length)return null;
      return mode==="dark"?Math.max(...levels):Math.min(...levels);
     },{data:"data:image/png;base64,"+bytes.toString("base64"),mode});
     // The strongest glyph pixels must be the muted placeholder, not the
     // brighter/darker ink of a filled input; allow antialiasing differences.
     assert(painted!==null&&painted>=(mode==="dark"?145:95)&&painted<=(mode==="dark"?185:140),"painted WebKit placeholder "+mode+": "+painted);
    }
   }
   await field.evaluate(el=>el.disabled=true);
   const disabled=await page.evaluate(()=>{const p=document.createElement("span");p.style.color="var(--disabled)";document.body.append(p);const c=getComputedStyle(p).color;p.remove();return c;});
   assert.equal(await field.evaluate(el=>getComputedStyle(el).color),disabled,"disabled MDC input ink");
   assert.equal(await field.evaluate(el=>getComputedStyle(el).webkitTextFillColor),disabled);
   await field.evaluate(el=>el.disabled=false);
   const expectedInk=await page.evaluate(()=>{const p=document.createElement("span");p.style.color="var(--ink)";document.body.append(p);const color=getComputedStyle(p).color;p.remove();return color;});
   const auditText=page.locator("#ml-control-audit input:not([type=submit]):not([type=reset]):not([type=file])");
   assert.equal(await auditText.count(),8);
   for(let i=0;i<8;i++){
    const control=auditText.nth(i);
    assert.equal(await control.evaluate(el=>getComputedStyle(el).color),expectedInk,"native/MDC text input ink "+i+" in "+mode);
    assert.equal(await control.evaluate(el=>getComputedStyle(el).webkitTextFillColor),expectedInk,"native/MDC text fill "+i+" in "+mode);
   }
   const auditArea=page.locator("#audit-textarea");
   assert.equal(await auditArea.evaluate(el=>getComputedStyle(el).color),expectedInk,"textarea ink "+mode);
   assert.equal(await page.locator("#audit-select + .ml-mdc-select .mdc-select__selected-text").evaluate(el=>getComputedStyle(el).color),expectedInk,"MDC select ink "+mode);
   await page.locator("#audit-text").evaluate(el=>el.disabled=true);
   const disabledInk=await page.evaluate(()=>{const p=document.createElement("span");p.style.color="var(--disabled)";document.body.append(p);const color=getComputedStyle(p).color;p.remove();return color;});
   assert.equal(await page.locator("#audit-text").evaluate(el=>getComputedStyle(el).color),disabledInk,"disabled ink "+mode);
   await page.locator("#audit-text").evaluate(el=>el.disabled=false);
   await page.locator("#audit-email").evaluate(el=>el.readOnly=true);
   assert.equal(await page.locator("#audit-email").evaluate(el=>getComputedStyle(el).color),expectedInk,"readonly ink "+mode);
   await page.locator("#audit-email").evaluate(el=>el.readOnly=false);
   await page.locator("#audit-url").evaluate(el=>el.setAttribute("aria-invalid","true"));
   assert.equal(await page.locator("#audit-url").evaluate(el=>getComputedStyle(el).color),expectedInk,"invalid input remains readable "+mode);
   const buttonStyle=await page.locator("#audit-button").evaluate(el=>{const s=getComputedStyle(el),b=el.getBoundingClientRect(),t=el.querySelector(".mdc-button__label").getBoundingClientRect();return {display:s.display,align:s.alignItems,justify:s.justifyContent,textAlign:s.textAlign,border:s.borderTopColor,dx:Math.abs(t.x+t.width/2-b.x-b.width/2),dy:Math.abs(t.y+t.height/2-b.y-b.height/2)};});
   assert.equal(buttonStyle.display,"inline-flex","MDC button flex layout");
   assert.equal(buttonStyle.align,"center");assert.equal(buttonStyle.justify,"center");assert.equal(buttonStyle.textAlign,"center");
   assert.equal(buttonStyle.border,"rgba(0, 0, 0, 0)","button border reset");
   assert(buttonStyle.dx<3&&buttonStyle.dy<4,"long mixed-language button label centered: "+JSON.stringify(buttonStyle));
   for(const id of ["audit-submit","audit-reset"]){
    const style=await page.locator("#"+id).evaluate(el=>({align:getComputedStyle(el).textAlign,border:getComputedStyle(el).borderTopColor,borderWidth:getComputedStyle(el).borderTopWidth,parent:[...el.parentElement.classList],nestedWrapper:!!el.parentElement.parentElement.closest(".ml-native-button"),height:el.parentElement.getBoundingClientRect().height}));
    assert.equal(style.align,"center");assert(style.border==="rgba(0, 0, 0, 0)"||style.borderWidth==="0px","native input button has no visible border: "+JSON.stringify(style));
    for(const cls of ["ml-native-button","ml-mdc-feedback","mdc-button"])assert(style.parent.includes(cls),"missing native action class "+cls);
    assert.equal(style.nestedWrapper,false,"native input button uses one visual wrapper");
    assert(style.height>=48,"native input button wrapper target size");
   }
   const nativePrimary=await page.locator("#audit-submit").locator("..").evaluate(el=>({background:getComputedStyle(el).backgroundColor,expected:(()=>{const p=document.createElement("span");p.style.backgroundColor="var(--action-fill)";document.body.append(p);const v=getComputedStyle(p).backgroundColor;p.remove();return v;})()}));
   assert.equal(nativePrimary.background,nativePrimary.expected,"wrapped input submit keeps its primary surface");
   const fileStyle=await page.locator("#audit-file").evaluate(el=>({border:getComputedStyle(el).borderBottomWidth,width:el.getBoundingClientRect().width}));
   assert.equal(fileStyle.border,"0px");assert(fileStyle.width>0);
   await page.locator("#audit-button").focus();
   assert.equal(await page.locator("#audit-button").evaluate(el=>getComputedStyle(el).borderTopColor),"rgba(0, 0, 0, 0)");
   await page.locator("#audit-button").click();
   assert.equal(await page.evaluate(()=>auditActions),1,"button callback preserved");
   await page.locator("#audit-submit").click();
   assert.equal(await page.evaluate(()=>window.auditSubmits||0),1,"native input submit preserved");
   await page.locator("#audit-div-button").focus();await page.keyboard.press("Enter");
   assert.equal(await page.locator("#audit-div-button").getAttribute("role"),"button","legacy div.btn role retained");
   if(name==="chromium")await page.screenshot({path:"dist/previews/"+name+"-"+size+"-shared-controls-"+mode+".png",fullPage:true});
   if(size==="desktop"){
    for(const suffix of ["lang","_mediaurlbase"]){
     const row=page.locator('.cbi-value[data-field$=".'+suffix+'"]');
     const label=await row.locator(".cbi-value-title").boundingBox(),anchor=await row.locator(".mdc-select__anchor").boundingBox();
     assert(Math.abs(label.y+label.height/2-anchor.y-anchor.height/2)<1,"language/design label center");
     const text=await row.locator(".mdc-select__selected-text").boundingBox();
     assert(Math.abs(text.y+text.height/2-anchor.y-anchor.height/2)<1,"language/design selected text center");
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
