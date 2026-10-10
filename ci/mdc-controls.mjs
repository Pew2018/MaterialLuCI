import assert from "node:assert/strict";
export async function verifyMDCControls(browser,name,base){
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.addInitScript(()=>{window.__mlControlAudit=true;});
 const errors=[];page.on("pageerror",error=>errors.push(error.message));
 await page.goto(base);await page.waitForFunction(()=>window.fixtureCheckbox&&window.MaterialControls&&document.body.dataset.mlMenus==="ready");
 const layout=await page.evaluate(()=>{
  const results=[];
  for(const el of document.querySelectorAll(".ml-mdc-feedback")){
   const old=el._mlBeforeMDC;if(!old||!old.width||!old.height)continue;
   const r=el.getBoundingClientRect(),s=getComputedStyle(el);
   results.push({label:el.id||el.className,width:r.width,height:r.height,old:{width:old.width,height:old.height,fontFamily:old.fontFamily,fontSize:old.fontSize,fontWeight:old.fontWeight,color:old.color,radius:old.radius},fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,color:s.color,radius:s.borderRadius,firstPreserved:el.firstChild===old.firstChild,official:!!el._mlMdcRipple});
  }return results;
 });
 for(const row of layout){
  assert(row.official,row.label+" missing MDC ripple");
  assert(row.firstPreserved,row.label+" first business node moved");
  assert(Math.abs(row.width-row.old.width)<1,row.label+" width changed "+row.old.width+" -> "+row.width);
  assert(Math.abs(row.height-row.old.height)<1,row.label+" height changed "+row.old.height+" -> "+row.height);
  for(const key of ["fontFamily","fontSize","fontWeight","color","radius"])assert.equal(row[key],row.old[key],row.label+" changed "+key);
 }
 assert(layout.length>=10,"too few actual controls audited");
 assert.equal(await page.locator(".tap-ripple").count(),0);
 assert.equal(await page.locator(".ml-mdc-feedback").evaluateAll(nodes=>nodes.filter(el=>!el.closest(".mdc-switch,.ml-mdc-selection")).every(el=>!!el._mlMdcRipple)),true);
 // Real upstream ui.Select DOM uses description.previousElementSibling twice.
 await page.evaluate(async()=>{
  const ui=await L.require("ui");window.realRadio=new ui.Select("one",{one:"第一项",two:"第二项"},{id:"real-radio",name:"radio-value",widget:"radio"});
  const box=document.createElement("div");box.id="migration-widgets";
  const radio=realRadio.render();box.append(radio);
  window.realCheck=new ui.Checkbox("0",{id:"real-check",name:"checkbox-value",hiddenname:"checkbox-marker"});
  box.append(realCheck.render());document.getElementById("maincontent").append(box);
  window.originalRadioInputs=[...radio.querySelectorAll("input")];window.originalRadioChildren=[...radio.querySelector(".cbi-radio").childNodes];
  window.selectionEvents={click:0,change:0};for(const input of box.querySelectorAll("input:not([type=hidden])"))for(const key of ["click","change"])input.addEventListener(key,()=>selectionEvents[key]++);
 });
 await page.waitForFunction(()=>document.querySelector("#real-check")._mlMdcSelection&&document.querySelector("#real-radio .cbi-radio")._mlMdcSelection);
 assert(await page.evaluate(()=>originalRadioInputs.every(input=>input.isConnected)&&originalRadioChildren.every((node,i)=>document.querySelector("#real-radio .cbi-radio").childNodes[i]===node)));
 await page.locator("#real-radio .cbi-radio").nth(1).locator(":scope > span:not(.mdc-radio__background):not(.mdc-radio__ripple):not(.mdc-radio__focus-ring)").first().click();
 assert.equal(await page.evaluate(()=>realRadio.getValue()),"two");
 assert.deepEqual(await page.evaluate(()=>selectionEvents),{click:1,change:1});
 await page.locator("#real-check label").first().click();assert.equal(await page.evaluate(()=>realCheck.getValue()),"1");
 assert.deepEqual(await page.evaluate(()=>selectionEvents),{click:2,change:2});
 assert.equal(await page.locator('#real-check input[type=hidden]').inputValue(),"1");
 await page.evaluate(()=>{realCheck.setValue("0");document.querySelector("#real-check input[type=checkbox]").indeterminate=true;});
 assert(await page.evaluate(()=>document.querySelector("#real-check")._mlMdcSelection.indeterminate));
 // Real modal API and its exact children/firstChild contract.
 await page.evaluate(async()=>{
  const ui=await L.require("ui");window.nativeModalInput=document.createElement("input");nativeModalInput.type="text";nativeModalInput.id="mdc-real-modal-input";nativeModalInput.value="retained draft";
  const row=document.createElement("div");row.className="right";const cancel=document.createElement("button");cancel.id="mdc-real-modal-close";cancel.textContent="关闭";cancel.onclick=()=>ui.hideModal();row.append(cancel);
  window.nativeModal=ui.showModal("兼容性检查",[nativeModalInput,row]);window.modalBusinessChildren=[...nativeModal.childNodes];window.modalOriginalFirst=document.getElementById("modal_overlay").firstElementChild;
 });
 await page.waitForFunction(()=>document.getElementById("modal_overlay")._mlMdcDialog?.isOpen);
 assert(await page.evaluate(()=>document.getElementById("modal_overlay").firstElementChild===modalOriginalFirst&&modalBusinessChildren.every((node,i)=>nativeModal.childNodes[i]===node)));
 await page.locator("#mdc-real-modal-input").fill("preserved edit");
 await page.keyboard.press("Escape");assert(await page.evaluate(()=>document.body.classList.contains("modal-overlay-active")),"business modal acquired new Escape dismissal");
 await page.locator("#mdc-real-modal-close").focus();await page.keyboard.press("Tab");assert(await page.locator("#mdc-real-modal-input").evaluate(el=>document.activeElement===el),"dialog focus escaped");
 await page.screenshot({path:"dist/previews/mdc-controls-"+name+"-desktop-dialog.png"});
 await page.locator("#mdc-real-modal-close").click();await page.waitForFunction(()=>!document.getElementById("modal_overlay")._mlMdcDialog);
 assert.equal(await page.evaluate(()=>nativeModalInput.value),"preserved edit");
 // Theme helper: original history, choice action, Escape and focus restoration.
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{window.choiceChanges=[];MaterialLuCI.choose("选择模式",[["one","第一项"],["two","第二项"]],"one",key=>choiceChanges.push(key));});
 await page.waitForFunction(()=>document.querySelector(".ml-backdrop")?._mlMdcDialog?.isOpen);
 await page.waitForFunction(()=>document.querySelector(".ml-radio")?._mlMdcSelection);
 await page.screenshot({path:"dist/previews/mdc-controls-"+name+"-mobile-choice.png"});
 await page.getByRole("radio",{name:"第二项",exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector(".ml-backdrop"));
 assert.deepEqual(await page.evaluate(()=>choiceChanges),["two"]);
 await page.evaluate(()=>MaterialLuCI.choose("取消检查",[["one","第一项"]],"one",()=>choiceChanges.push("unexpected")));
 await page.keyboard.press("Escape");await page.waitForFunction(()=>!document.querySelector(".ml-backdrop"));assert.deepEqual(await page.evaluate(()=>choiceChanges),["two"]);
 await page.evaluate(()=>{document.getElementById("migration-widgets").remove();});
 await page.waitForFunction(()=>originalRadioInputs.every(input=>input._mlMdcSelection===null));
 assert.equal(await page.evaluate(()=>document.body.classList.contains("mdc-dialog-scroll-lock")),false);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:"dist/previews/mdc-controls-"+name+"-mobile.png"});
 await page.close();console.log(name+": official MDC controls, original geometry/font/ink, native events, sibling contracts, dialog lifecycle and cleanup passed");
}
