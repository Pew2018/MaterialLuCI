"use strict";
/* Presentation adapters. Native LuCI controls remain the business authority. */
(function(){
 const m3=()=>MaterialAppearance.activeDesign==="m3e";
 const stateWatchers=new Map();
 const stateObserver=new MutationObserver(records=>{
  const pending=new Set();
  for(const r of records){if(stateWatchers.has(r.target))pending.add(r.target);else if(r.target.tagName==="FIELDSET")for(const input of r.target.querySelectorAll("input"))if(stateWatchers.has(input))pending.add(input);}
  for(const input of pending)stateWatchers.get(input)?.();
 });
 stateObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:["checked","disabled","name","form","type"]});
 function watchState(input,sync){stateWatchers.set(input,sync);return {disconnect(){stateWatchers.delete(input);}};}
 const supported=name=>m3()&&!!window.customElements?.get(name);
 function button(label,listener,className,kind="outlined"){
  const tag=kind==="text"?"md-text-button":kind==="filled"?"md-filled-button":"md-outlined-button";
  const el=document.createElement(supported(tag)?tag:"button");
  // Material Web form-associated buttons default to submit, like HTML buttons.
  // Appearance actions must never submit or reset a containing LuCI form.
  el.type="button";el.setAttribute("type","button");
  el.className=className;el.textContent=label;el.addEventListener("click",listener);
  if(el.tagName!=="BUTTON")el.dataset.mlComponent="button";
  return el;
 }
 function switchControl(input,label){
  if(!supported("md-switch"))return null;
  const el=document.createElement("md-switch");el.dataset.mlComponent="switch";el.setAttribute("aria-label",label);
  const saved={tabindex:input.getAttribute("tabindex"),aria:input.getAttribute("aria-hidden")};
  const sync=()=>{const checked=!!input.checked,disabled=input.matches(":disabled");if(el.selected!==checked)el.selected=checked;if(el.disabled!==disabled)el.disabled=disabled;};
  input.classList.add("ml-switch-source");input.tabIndex=-1;input.setAttribute("aria-hidden","true");
  const descriptors=[];
  for(const key of ["checked","disabled"]){
   if(Object.getOwnPropertyDescriptor(input,key))continue;
   const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,key);
   Object.defineProperty(input,key,{configurable:true,get(){return d.get.call(this);},set(value){d.set.call(this,value);sync();}});descriptors.push(key);
  }
  input.addEventListener("change",sync);input.addEventListener("input",sync);
  // Effective fieldset disablement is read, never written to input.disabled.
  const observer=watchState(input,sync);
  const reset=()=>queueMicrotask(sync);document.addEventListener("reset",reset,true);
  el.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();if(!input.matches(":disabled"))input.click();queueMicrotask(sync);});
  // Consume decoration events, not the original checkbox's native events.
  el.addEventListener("input",event=>event.stopPropagation());el.addEventListener("change",event=>event.stopPropagation());
  let destroyed=false;
  const destroy=()=>{if(destroyed)return;destroyed=true;observer.disconnect();document.removeEventListener("reset",reset,true);input.removeEventListener("change",sync);input.removeEventListener("input",sync);for(const key of descriptors)delete input[key];input.classList.remove("ml-switch-source");for(const [key,value] of [["tabindex",saved.tabindex],["aria-hidden",saved.aria]])if(value===null)input.removeAttribute(key);else input.setAttribute(key,value);el.remove();};
  sync();return {control:el,destroy};
 }
 function selectionControl(input,label){
  const radio=input.type==="radio",tag=radio?"md-radio":"md-checkbox";
  if(!supported(tag))return null;
  const el=document.createElement(tag),root=input.parentElement;
  el.dataset.mlComponent=radio?"radio":"checkbox";el.setAttribute("aria-label",label);
  const oldTab=input.getAttribute("tabindex"),oldAria=input.getAttribute("aria-hidden");
  input.classList.add("ml-m3-selection-source");input.tabIndex=-1;input.setAttribute("aria-hidden","true");root.classList.add("ml-m3-selection");
  const sync=()=>{const disabled=input.matches(":disabled");if(el.checked!==input.checked)el.checked=input.checked;if(el.disabled!==disabled)el.disabled=disabled;if(!radio&&el.indeterminate!==input.indeterminate)el.indeterminate=input.indeterminate;};
  const hooks=[];
  for(const key of ["checked","disabled","indeterminate"]){
   if(Object.getOwnPropertyDescriptor(input,key))continue;
   const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,key);
   Object.defineProperty(input,key,{configurable:true,get(){return d.get.call(this);},set(value){d.set.call(this,value);syncSelections(input);}});hooks.push(key);
  }
  const click=event=>{event.preventDefault();event.stopPropagation();if(!input.matches(":disabled"))input.click();syncSelections(input);};
  el.addEventListener("click",click);el.addEventListener("input",event=>event.stopPropagation());el.addEventListener("change",event=>event.stopPropagation());
  const key=event=>{if(!radio||!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key))return;event.preventDefault();event.stopImmediatePropagation();
   const group=[...groupFor(input)].filter(n=>!n.matches(":disabled")).sort((a,b)=>a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_PRECEDING?1:-1);
   if(!input.name||!group.length)return;const backwards=["ArrowLeft","ArrowUp"].includes(event.key),next=group[(group.indexOf(input)+(backwards?-1:1)+group.length)%group.length];next.click();syncSelections(next);selectionEntries.get(next)?.control.focus();};
  el.addEventListener("keydown",key);
  const change=()=>syncSelections(input);input.addEventListener("change",change);
  const attrs=watchState(input,change);
  const reset=event=>{if(input.form===event.target)queueMicrotask(change);};document.addEventListener("reset",reset,true);
  const geometry=()=>MaterialRuntime.position(input,()=>input.isConnected?[input.offsetLeft,input.offsetTop]:null,([x,y])=>{MaterialRuntime.setStyle(el,"left",x+"px");MaterialRuntime.setStyle(el,"top",y+"px");});
  const unwatch=MaterialRuntime.watchSize(root,geometry);
  let destroyed=false;
  const entry={control:el,sync,destroy(){if(destroyed)return;destroyed=true;attrs.disconnect();unwatch();MaterialRuntime.dropPosition(input);leaveGroup(input);input.removeEventListener("change",change);document.removeEventListener("reset",reset,true);for(const key of hooks)delete input[key];input.classList.remove("ml-m3-selection-source");root.classList.remove("ml-m3-selection");for(const [key,value] of [["tabindex",oldTab],["aria-hidden",oldAria]])if(value===null)input.removeAttribute(key);else input.setAttribute(key,value);selectionEntries.delete(input);el.remove();}};
  selectionEntries.set(input,entry);root.append(el);syncSelections(input);geometry();return entry;
 }
 const selectionEntries=new Map();
 const groupRoots=new WeakMap(),membership=new WeakMap();
 function groupFor(input){
  if(input.type!=="radio"||!input.name)return new Set([input]);
  const root=input.getRootNode(),form=input.form;
  let forms=groupRoots.get(root);if(!forms){forms=new Map();groupRoots.set(root,forms);}
  let names=forms.get(form);if(!names){names=new Map();forms.set(form,names);}
  let group=names.get(input.name);if(!group){group=new Set();names.set(input.name,group);}
  return group;
 }
 function leaveGroup(input){const group=membership.get(input);if(group){group.delete(input);membership.delete(input);updateGroup(group);}}
 function updateGroup(group){
  const enabled=[...group].filter(n=>n.isConnected&&!n.matches(":disabled")),active=enabled.find(n=>n.checked)||enabled[0];
  for(const n of group){const entry=selectionEntries.get(n);if(!entry)continue;entry.sync();const tab=n.matches(":disabled")?-1:!n.name||n===active?0:-1;if(entry.control.tabIndex!==tab)entry.control.tabIndex=tab;}
 }
 function syncSelections(input){
  if(!input||!selectionEntries.has(input))return;
  const group=groupFor(input),old=membership.get(input);
  if(old!==group){if(old){old.delete(input);updateGroup(old);}group.add(input);membership.set(input,group);}
  updateGroup(group);
 }
 function progress(node){
  if(m3()){
   // Project-owned M3 Expressive adapter: Material Web 2.5 has no wavy API.
   // Native host retains the accessible indeterminate progress semantics.
   node.classList.remove("mdc-linear-progress","mdc-linear-progress--indeterminate","mdc-linear-progress--closed");
   node.dataset.mlProgressEngine="m3e";node.dataset.mlComponent="progress";
   const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg");
   svg.classList.add("ml-wavy-progress");svg.setAttribute("aria-hidden","true");
   const path=cls=>{const p=document.createElementNS(ns,"path");p.setAttribute("class",cls);p.setAttribute("pathLength","100");svg.append(p);return p;};
   const track=path("ml-wave-track"),active=path("ml-wave-active");
   node.replaceChildren(svg);
   let width=0;
   const paint=()=>{const next=Math.round(node.getBoundingClientRect().width);if(next===width||next<1)return;width=next;
    svg.setAttribute("viewBox","0 0 "+width+" 16");
    // Constant 32px wavelength across every viewport; four-pixel round stroke.
    let d="M 0 8";for(let x=0;x<width;x+=32)d+=" Q "+(x+8)+" 0 "+(x+16)+" 8 Q "+(x+24)+" 16 "+(x+32)+" 8";
    track.setAttribute("d",d);active.setAttribute("d",d);
   };
   const resize=new ResizeObserver(paint);resize.observe(node);paint();
   return {determinate:false,buffer:1,open(){},destroy(){resize.disconnect();svg.remove();}};
  }
  if(window.MaterialMDC?.MDCLinearProgress){node.dataset.mlProgressEngine="mdc";return new MaterialMDC.MDCLinearProgress(node);}
  node.dataset.mlProgressFallback="true";node.textContent="";return {open(){},destroy(){}};
 }
 function enhance(root){
  if(root.closest?.("[data-ml-component]"))return;
  window.MaterialTextFields?.enhance(root);window.MaterialControls?.enhance(root);window.MaterialFeedback?.bind(root);window.MaterialExtras?.enhance(root);
 }
 window.addEventListener("pagehide",event=>{if(!event.persisted)stateObserver.disconnect();});
 window.MaterialComponents={button,switchControl,selectionControl,syncSelections,progress,enhance,isM3:m3};
})();
