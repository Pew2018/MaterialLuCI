import assert from "node:assert/strict";

// Execute native state checks synchronously before any enhancement observer.
// Supplement real LuCI renderers; this is deliberately not a replacement page.
export async function verifySharedStates(page,name,mode,size){
 const native=await page.evaluate(()=>{
  const color=token=>{const probe=document.createElement("span");probe.style.color="var("+token+")";document.body.append(probe);const c=getComputedStyle(probe).color;probe.remove();return c;};
  const expected={ink:color("--ink"),disabled:color("--disabled"),muted:color("--muted")};
  const host=document.createElement("div");document.getElementById("maincontent").append(host);
  const rows=[];
  for(const type of ["implicit","","text","password","number","email","url","tel","search","textarea","select"]){
   const el=document.createElement(["textarea","select"].includes(type)?type:"input");
   if(el.tagName==="INPUT"&&type!=="implicit")el.setAttribute("type",type);
   if(type==="select")el.add(new Option("原生选择 Selected","one"));
   else{el.placeholder="默认文字 Placeholder";el.value=type==="number"?"42":"已有值";}
   host.append(el);
   const snapshot=()=>{const s=getComputedStyle(el),p=getComputedStyle(el,"::placeholder");return {color:s.color,fill:s.webkitTextFillColor,placeholder:p.color,placeholderFill:p.webkitTextFillColor};};
   const normal=snapshot();el.disabled=true;const disabled=snapshot();
   el.readOnly=true;const both=snapshot();el.disabled=false;const readonly=snapshot();
   el.readOnly=false;el.setAttribute("aria-invalid","true");const invalid=snapshot();el.focus();const focus=snapshot();el.blur();
   rows.push({type,normal,disabled,both,readonly,invalid,focus});
  }
  host.remove();return {expected,rows};
 });
 for(const row of native.rows){
  for(const state of ["normal","readonly","invalid","focus"]){
   assert.equal(row[state].color,native.expected.ink,row.type+" native "+state+" color "+mode);
   assert.equal(row[state].fill,native.expected.ink,row.type+" native "+state+" fill "+mode);
  }
  for(const state of ["disabled","both"]){
   assert.equal(row[state].color,native.expected.disabled,row.type+" native "+state+" color "+mode);
   assert.equal(row[state].fill,native.expected.disabled,row.type+" native "+state+" fill "+mode);
  }
  if(name==="chromium"&&row.type!=="select"){
   assert.equal(row.normal.placeholder,native.expected.muted,row.type+" native placeholder");
   assert.equal(row.disabled.placeholder,native.expected.disabled,row.type+" disabled placeholder");
   assert.equal(row.disabled.placeholderFill,native.expected.disabled);
  }
 }
 // This is the actual upstream DynamicList node, not a replacement input.
 const list=page.locator(".cbi-dynlist .add-item > input").first();
 await list.evaluate(el=>el.disabled=true);
 assert.equal(await list.evaluate(el=>getComputedStyle(el).color),native.expected.disabled);
 assert.equal(await list.evaluate(el=>getComputedStyle(el).webkitTextFillColor),native.expected.disabled);
 if(name==="chromium")assert.equal(await list.evaluate(el=>getComputedStyle(el,"::placeholder").color),native.expected.disabled);
 await list.evaluate(el=>el.disabled=false);
 // Native selects intentionally excluded from the MDC mirror must stay styled.
 await page.evaluate(()=>{
  let host=document.getElementById("native-select-states");
  if(host)return;
  host=document.createElement("section");host.id="native-select-states";
  for(const kind of ["multiple","size","optgroup","explicit"]){
   const select=document.createElement("select");select.id="native-select-"+kind;select.name=select.id;
   if(kind==="multiple")select.multiple=true;
   if(kind==="size")select.size=3;
   if(kind==="explicit")select.setAttribute("data-ml-native","");
   if(kind==="optgroup"){const group=document.createElement("optgroup");group.label="分组选项";group.append(new Option("已选择 Selected","one"));select.append(group);}
   else select.add(new Option("已选择 Selected","one"));
   select.add(new Option("未选择 Another","two"));host.append(select);
  }
  document.getElementById("ml-control-audit").append(host);
  const button=document.createElement("button");button.type="button";button.className="cbi-button cbi-button-negative";button.id="long-danger-action";button.style.width="176px";
  const label=document.createElement("span");label.textContent="需要换行的危险操作 Long destructive action";button.append(label);host.append(button);
  MaterialLuCI.enhance(host);
 });
 for(const kind of ["multiple","size","optgroup","explicit"]){
  const select=page.locator("#native-select-"+kind);
  assert.equal(await select.evaluate(el=>el.classList.contains("ml-mdc-native-select")),false);
  assert.equal(await select.evaluate(el=>getComputedStyle(el).color),native.expected.ink);
  await select.evaluate(el=>el.disabled=true);
  assert.equal(await select.evaluate(el=>getComputedStyle(el).color),native.expected.disabled);
  assert.equal(await select.evaluate(el=>getComputedStyle(el).webkitTextFillColor),native.expected.disabled);
  await select.evaluate(el=>el.disabled=false);
 }
 await page.evaluate(()=>{
  if(document.getElementById("inherited-disabled-fields"))return;
  const fieldset=document.createElement("fieldset");fieldset.id="inherited-disabled-fields";
  const input=document.createElement("input");input.id="fieldset-text";input.value="Inherited disabled state";
  const select=document.createElement("select");select.id="fieldset-select";select.add(new Option("已标记 Selected","t"));select.add(new Option("未标记 Other","u"));
  fieldset.append(input,select);document.getElementById("native-select-states").append(fieldset);
  window.inheritedStateChanges=0;for(const field of [input,select])for(const event of ["input","change"])field.addEventListener(event,()=>inheritedStateChanges++);
  MaterialLuCI.enhance(fieldset);
 });
 await page.locator("#inherited-disabled-fields").evaluate(el=>el.disabled=true);
 await page.waitForFunction(()=>document.querySelector("#fieldset-text").closest(".ml-text-field").classList.contains("mdc-text-field--disabled")&&document.querySelector("#fieldset-select")._mlMdcSelect.disabled);
 assert.equal(await page.locator("#fieldset-text").evaluate(el=>getComputedStyle(el).color),native.expected.disabled);
 assert.equal(await page.locator("#fieldset-select + .ml-mdc-select .mdc-select__selected-text").evaluate(el=>getComputedStyle(el).color),native.expected.disabled);
 assert.equal(await page.locator("#fieldset-select").inputValue(),"t");
 assert.equal(await page.evaluate(()=>inheritedStateChanges),0,"presentation state changes must not emit value events");
 await page.locator("#inherited-disabled-fields").evaluate(el=>el.disabled=false);
 await page.waitForFunction(()=>!document.querySelector("#fieldset-text").closest(".ml-text-field").classList.contains("mdc-text-field--disabled")&&!document.querySelector("#fieldset-select")._mlMdcSelect.disabled);
 const div=page.locator("#audit-div-button");
 await div.evaluate(el=>el.setAttribute("aria-disabled","true"));
 assert.equal(await div.evaluate(el=>getComputedStyle(el).color),native.expected.disabled,"aria-disabled div button foreground");
 await div.evaluate(el=>el.removeAttribute("aria-disabled"));
 const roles=await page.evaluate(()=>{
  const color=token=>{const p=document.createElement("span");p.style.color="var("+token+")";document.body.append(p);const c=getComputedStyle(p).color;p.remove();return c;};
  return {primary:color("--on-accent"),disabled:color("--disabled"),pressed:color("--pressed")};
 });
 const submit=page.locator("#audit-submit"),wrapper=submit.locator("..");
 assert.equal(await wrapper.evaluate(el=>getComputedStyle(el).color),roles.primary,"native wrapper primary foreground");
 assert.equal(await submit.evaluate(el=>getComputedStyle(el).color),roles.primary,"native submit primary foreground");
 assert.equal(await submit.evaluate(el=>getComputedStyle(el).webkitTextFillColor),roles.primary);
 await submit.evaluate(el=>el.disabled=true);
 assert.equal(await wrapper.evaluate(el=>getComputedStyle(el).backgroundColor),roles.pressed,"disabled wrapper surface");
 assert.equal(await submit.evaluate(el=>getComputedStyle(el).color),roles.disabled);
 assert.equal(await submit.evaluate(el=>getComputedStyle(el).webkitTextFillColor),roles.disabled);
 await submit.evaluate(el=>el.disabled=false);
 const long=page.locator("#long-danger-action");
 const geometry=await long.evaluate(el=>{const r=el.getBoundingClientRect(),label=el.querySelector("span").getBoundingClientRect(),s=getComputedStyle(el);return {wrap:s.whiteSpace,width:el.clientWidth,scroll:el.scrollWidth,dx:Math.abs(r.x+r.width/2-label.x-label.width/2),dy:Math.abs(r.y+r.height/2-label.y-label.height/2)};});
 assert.equal(geometry.wrap,"normal");assert(geometry.scroll<=geometry.width&&geometry.dx<3&&geometry.dy<4,"long danger label centered without clipping "+JSON.stringify(geometry));
 if(name==="chromium"){
  // Force the browser's actual CSS pseudo-state, not an invented DOM class.
  // This checks UA autofill paint/cascade; stored-password delivery is not simulated.
  const session=await page.context().newCDPSession(page);
  await session.send("DOM.enable");await session.send("CSS.enable");
  const {root}=await session.send("DOM.getDocument");
  const {nodeId}=await session.send("DOM.querySelector",{nodeId:root.nodeId,selector:"#audit-text"});
  await session.send("CSS.forcePseudoState",{nodeId,forcedPseudoClasses:["autofill"]});
  const autofill=page.locator("#audit-text");
  assert(await autofill.evaluate(el=>el.matches(":-webkit-autofill")),"Chromium autofill pseudo-state active");
  const paint=await autofill.evaluate(el=>{const s=getComputedStyle(el);return {fill:s.webkitTextFillColor,shadow:s.boxShadow};});
  assert.equal(paint.fill,native.expected.ink);assert(paint.shadow.includes("1000px")&&paint.shadow.includes("inset"),"MDC autofill background reset wins");
  await autofill.scrollIntoViewIfNeeded();
  await page.screenshot({path:"dist/previews/"+name+"-"+size+"-autofill-"+mode+".png"});
  await session.send("CSS.forcePseudoState",{nodeId,forcedPseudoClasses:[]});
  const {nodeId:buttonId}=await session.send("DOM.querySelector",{nodeId:root.nodeId,selector:"#audit-bare-button"});
  for(const [state,token] of [["hover","--button-hover-bg"],["active","--button-pressed-bg"]]){
   await session.send("CSS.forcePseudoState",{nodeId:buttonId,forcedPseudoClasses:[state]});
   const colors=await page.locator("#audit-bare-button").evaluate((el,token)=>{const probe=document.createElement("span");probe.style.backgroundColor=getComputedStyle(el).getPropertyValue(token);document.body.append(probe);const expected=getComputedStyle(probe).backgroundColor;probe.remove();return {actual:getComputedStyle(el).backgroundColor,expected};},token);
   assert.equal(colors.actual,colors.expected,"bare native button "+state);
  }
  await session.send("CSS.forcePseudoState",{nodeId:buttonId,forcedPseudoClasses:[]});await session.detach();
 }
 await page.locator("#native-select-states").scrollIntoViewIfNeeded();
 await page.screenshot({path:"dist/previews/"+name+"-"+size+"-native-states-"+mode+".png"});
 console.log(name,size,mode+": native/MDC state parity, primary/disabled foreground, long danger and select fallback checked");
}
