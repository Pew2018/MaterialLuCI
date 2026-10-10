import assert from "node:assert/strict";
export async function verifyMDCExtras(browser,name,base){
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on("pageerror",e=>{errors.push(e.message);console.error("extras browser error",e.message);});
 await page.goto(base);await page.waitForFunction(()=>window.MaterialExtras&&window.fixtureSelect);
 await page.waitForFunction(()=>document.querySelector("#real-select select")?._mlMdcSelect);
 assert(await page.evaluate(()=>fixtureSelect.node.firstChild.tagName==="SELECT"),"LuCI Select firstChild contract changed");
 await page.evaluate(()=>{
  window.extraChanges=0;window.extraSelect=document.querySelector("#real-select select");
  extraSelect.addEventListener("change",()=>{extraChanges++;document.getElementById("real-select").dataset.dependentValue=extraSelect.value;});
  window.extraParent=extraSelect.parentNode;
 });
 const root=page.locator("#real-select .ml-mdc-select"),anchor=root.locator(".mdc-select__anchor");
 const choose=async value=>{
  await page.waitForTimeout(350);await anchor.click();
  await page.locator('.ml-select-menu.mdc-menu-surface--open [data-value="'+value+'"]').click();
  await page.waitForTimeout(160);
 };
 await choose("manual");assert.equal(await page.evaluate(()=>fixtureSelect.getValue()),"manual");assert.equal(await page.evaluate(()=>extraChanges),1,"selection fired multiple native changes");
 assert.equal(await page.locator("#real-select").getAttribute("data-dependent-value"),"manual","native dependent handler missed selection");
 await page.evaluate(()=>fixtureSelect.setValue("auto"));
 await page.waitForFunction(()=>extraSelect._mlMdcSelect.value==="auto");
 assert.equal(await page.evaluate(()=>extraChanges),1,"programmatic value fired native change");
 await page.evaluate(()=>{extraSelect.append(new Option("动态选项","dynamic"));extraSelect.options[1].disabled=true;});
 await page.waitForFunction(()=>extraSelect._mlMdcSelect.menu.items.some(li=>li.dataset.value==="dynamic"));
 await anchor.click();assert.equal(await page.locator('.ml-select-menu [data-value="manual"]').getAttribute("aria-disabled"),"true");
 await page.locator('.ml-select-menu.mdc-menu-surface--open [data-value="manual"]').click({force:true});
 assert.equal(await page.evaluate(()=>extraSelect.value),"auto","disabled choice changed native value");
 await page.keyboard.press("Escape");await page.waitForTimeout(150);
 await choose("dynamic");assert.equal(await page.evaluate(()=>fixtureSelect.getValue()),"dynamic");assert.equal(await page.evaluate(()=>extraChanges),2);
 await page.evaluate(()=>{extraSelect.disabled=true;});
 await page.waitForFunction(()=>extraSelect._mlMdcSelect.disabled);
 assert.equal(await anchor.getAttribute("aria-disabled"),"true");
 await page.evaluate(()=>{extraSelect.disabled=false;extraSelect.value="auto";});
 await page.waitForFunction(()=>!extraSelect._mlMdcSelect.disabled&&extraSelect._mlMdcSelect.value==="auto");
 await anchor.focus();await page.keyboard.press("Enter");await page.waitForSelector(".ml-select-menu.mdc-menu-surface--open");
 await page.keyboard.press("Escape");await page.waitForFunction(()=>document.querySelector("#real-select .mdc-select__anchor")===document.activeElement);assert(await anchor.evaluate(el=>el===document.activeElement),"select did not restore focus");
 // Native validity and original form-reset behavior remain authoritative.
 await page.evaluate(()=>{extraSelect.required=true;extraSelect.value="";});
 await page.waitForFunction(()=>extraSelect._mlMdcSelect.selectedIndex===-1);
 assert.equal(await page.evaluate(()=>extraSelect.checkValidity()),false);
 await page.waitForFunction(()=>document.querySelector("#real-select .mdc-select__anchor").getAttribute("aria-invalid")==="true");
 assert(await anchor.evaluate(el=>el===document.activeElement),"invalid native select did not focus the visible control");
 await page.evaluate(()=>{extraSelect.required=false;extraSelect.value="auto";extraSelect.form?.reset();});
 await page.waitForFunction(()=>extraSelect._mlMdcSelect.value==="auto");
 assert.equal(await page.evaluate(()=>extraChanges),2,"validation/reset manufactured a field change");
 // Unconverted multiple/optgroup fields keep native behavior and original identity.
 await page.evaluate(()=>{
  const m=document.createElement("select");m.multiple=true;m.id="extras-multiple";m.add(new Option("多选","multi"));
  const g=document.createElement("select");g.id="extras-optgroup";g.innerHTML='<optgroup label="分组"><option value="group">分组选项</option></optgroup>';
  document.getElementById("maincontent").append(m,g);MaterialExtras.enhance(document);
 });
 assert.equal(await page.locator("#extras-multiple").evaluate(el=>!!el._mlMdcSelect),false);
 assert.equal(await page.locator("#extras-optgroup").evaluate(el=>!!el._mlMdcSelect),false);
 // Actual LuCI action dropdown: preserve last-child hidden value container.
 await page.evaluate(async()=>{
  const ui=await L.require("ui");window.extraAction=new ui.Dropdown("apply",{apply:"保存并应用",unchecked:"无需检查直接应用",blocked:"不可用"},{id:"extras-action",optional:false,name:"apply-kind"});
  const node=extraAction.render();node.classList.add("btn","cbi-button","cbi-button-apply");
  node.querySelector('[data-value="blocked"]').setAttribute("unselectable","");
  window.originalActionFirst=node.firstChild;window.originalActionLast=node.lastElementChild;window.actionCalls=[];
  node.addEventListener("cbi-dropdown-change",e=>actionCalls.push(e.detail.value?.value));
  document.getElementById("maincontent").append(node);MaterialExtras.enhance(node);MaterialFeedback.bind(node);
 });
 const arrow=page.locator("#extras-action>.open");
 await arrow.click();await page.waitForSelector(".ml-action-menu.mdc-menu-surface--open");await arrow.click();await page.waitForSelector(".ml-action-menu.mdc-menu-surface--open",{state:"detached"});
 await arrow.focus();await page.keyboard.press("Enter");await page.waitForSelector(".ml-action-menu.mdc-menu-surface--open");
 await page.waitForFunction(()=>!!document.activeElement.closest(".ml-action-menu"));
 assert(await page.locator('.ml-action-menu [data-value="apply"]').evaluate(el=>!!el._mlMdcRipple),"official menu ripple was not initialized");
 assert(await page.locator('.ml-action-menu [data-value="blocked"]').evaluate(el=>el._mlMdcRipple.disabled),"disabled menu ripple remained active");
 await page.keyboard.press("ArrowDown");assert.equal(await page.evaluate(()=>document.activeElement.dataset.value),"apply");
 await page.keyboard.press("ArrowDown");assert.equal(await page.evaluate(()=>document.activeElement.dataset.value),"unchecked");
 await page.keyboard.press("ArrowDown");assert.equal(await page.evaluate(()=>document.activeElement.dataset.value),"apply","keyboard did not skip disabled menu item");
 await page.keyboard.press("Escape");await page.waitForTimeout(160);assert(await arrow.evaluate(el=>el===document.activeElement));
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:844});await arrow.scrollIntoViewIfNeeded();await arrow.click();
  await page.waitForSelector(".ml-action-menu.mdc-menu-surface--open");
  const box=await page.locator(".ml-action-menu.mdc-menu-surface--open").boundingBox();
  assert(box.x>=0&&box.x+box.width<=width+1,"action menu horizontal overflow");
  assert(box.y>=0&&box.y+box.height<=845,"action menu vertical overflow");
  await page.screenshot({path:"dist/previews/extras-"+name+"-"+width+"-menu.png"});
  await page.locator('.ml-action-menu.mdc-menu-surface--open [data-value="blocked"]').click({force:true});
  assert.equal(await page.evaluate(()=>extraAction.getValue()),width===1440?"apply":"unchecked");
  await page.locator('.ml-action-menu.mdc-menu-surface--open [data-value="unchecked"]').click();await page.waitForTimeout(160);
 }
 await arrow.focus();await page.keyboard.press("Enter");await page.waitForFunction(()=>!!document.activeElement.closest(".ml-action-menu"));
 await page.keyboard.press("ArrowDown");await page.keyboard.press("ArrowDown");await page.keyboard.press("Enter");await page.waitForTimeout(160);
 assert.deepEqual(await page.evaluate(()=>actionCalls),["unchecked","unchecked","unchecked"],"original action callbacks changed");
 assert(await page.evaluate(()=>document.getElementById("extras-action").firstChild===originalActionFirst&&document.getElementById("extras-action").lastElementChild===originalActionLast));
 await page.evaluate(()=>document.getElementById("extras-action").setAttribute("disabled",""));
 await arrow.click({force:true});assert.equal(await page.locator(".ml-action-menu.mdc-menu-surface--open").count(),0);
 // Tooltip leaves the accessible action name and click handler intact.
 const toggle=page.locator("#ml-menu-button");
 await toggle.focus();await page.waitForTimeout(650);
 assert(["菜单","Menu"].includes(await toggle.getAttribute("aria-label")),"localized accessible menu name was lost");
 assert(await toggle.evaluate(el=>!!el._mlMdcTooltip));
 await page.screenshot({path:"dist/previews/extras-"+name+"-tooltip.png"});
 await toggle.click();await page.waitForFunction(()=>document.body.classList.contains("ml-drawer-open"));await page.locator("#ml-drawer-close").click();
 await page.locator(".ml-mode-option").filter({hasText:"深色"}).click();
 await page.waitForSelector(".ml-preference-snackbar.mdc-snackbar--open");
 assert.equal(await page.locator(".ml-preference-snackbar .mdc-snackbar__label").textContent(),"已保存此浏览器的主题设置");
 await page.screenshot({path:"dist/previews/extras-"+name+"-snackbar.png"});
 await page.locator("#real-select").scrollIntoViewIfNeeded();
 assert.equal(await anchor.evaluate(el=>getComputedStyle(el).backgroundColor),"rgba(0, 0, 0, 0)","MDC default fill overrode dark select");
 assert.equal(await root.locator(".mdc-select__selected-text").evaluate(el=>getComputedStyle(el).color),"rgba(255, 255, 255, 0.87)","MDC default text overrode dark select");
 await anchor.click();
 await page.screenshot({path:"dist/previews/extras-"+name+"-select-dark.png"});await page.keyboard.press("Escape");
 // Accent text must remain readable on raised menus/dialogs, including
 // their white pressed overlay. Saved seeds are never modified.
 for(const seed of ["#42A5F5","#CC6F4E","#E6A545","#7DC22F","#9575CD","#26C6DA","#F06292","#BA68C8","#FFFFFF","#000000"]){
  const ratio=await page.evaluate(seed=>{const p=MaterialPalette.generate(seed,true);return {seed:p.seed,raised:MaterialPalette.contrast(p.accentInk,"#2D2D2D"),pressed:MaterialPalette.contrast(p.accentInk,"#424242")};},seed);
  assert.equal(ratio.seed,seed);assert(ratio.raised>=4.5&&ratio.pressed>=4.5,"raised accent contrast "+seed);
 }
 // Semantic card coverage includes standalone groups and plots, never rows.
 await page.evaluate(()=>{
  const group=document.createElement("div");group.id="extras-standalone";group.className="cbi-section-node";group.innerHTML="<h3>独立设置分组</h3><p>内容</p>";
  document.getElementById("maincontent").append(group);MaterialLuCI.enhance(group);
 });
 await page.waitForFunction(()=>document.getElementById("extras-standalone").classList.contains("ml-card-surface"));
 assert.equal(await page.locator(".ml-card-surface .ml-card-surface").count(),0,"nested card surfaces");
 for(const dark of [false,true])for(const cards of [false,true]){
  await page.evaluate(({dark,cards})=>{MaterialAppearance.set("mode",dark?"dark":"light");MaterialAppearance.set("cards",cards);},{dark,cards});
  const style=await page.locator("#extras-standalone").evaluate(el=>{const s=getComputedStyle(el);return {bg:s.backgroundColor,shadow:s.boxShadow};});
  assert.equal(style.bg,cards?(dark?"rgb(30, 30, 30)":"rgb(255, 255, 255)"):"rgba(0, 0, 0, 0)");
  if(!cards)assert.equal(style.shadow,"none");
  await page.screenshot({path:"dist/previews/extras-"+name+"-"+(dark?"dark":"light")+"-cards-"+cards+".png"});
 }
 await page.evaluate(()=>{extraParent.remove();document.getElementById("extras-action").remove();});
 await page.waitForFunction(()=>extraSelect._mlMdcSelect===null);
 assert.deepEqual(errors,[]);
 await page.close();console.log(name+": packaged MDC menus/selects/snackbar/tooltips, native values/events, contracts, disabled choices, focus, dynamic options and card coverage passed");
}
