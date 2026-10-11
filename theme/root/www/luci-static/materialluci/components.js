"use strict";
/* Presentation adapters. Native LuCI controls remain the business authority. */
(function(){
 const m3=()=>MaterialAppearance.activeDesign==="m3e";
 const supported=name=>m3()&&!!window.customElements?.get(name);
 function button(label,listener,className){
  const el=document.createElement(supported("md-outlined-button")?"md-outlined-button":"button");
  if(el.tagName==="BUTTON")el.type="button";
  el.className=className;el.textContent=label;el.addEventListener("click",listener);
  if(el.tagName!=="BUTTON")el.dataset.mlComponent="button";
  return el;
 }
 function switchControl(input,label){
  if(!supported("md-switch"))return null;
  const el=document.createElement("md-switch");el.dataset.mlComponent="switch";el.setAttribute("aria-label",label);
  const saved={tabindex:input.getAttribute("tabindex"),aria:input.getAttribute("aria-hidden")};
  const sync=()=>{el.selected=!!input.checked;el.disabled=input.matches(":disabled");};
  input.classList.add("ml-switch-source");input.tabIndex=-1;input.setAttribute("aria-hidden","true");
  const descriptors=[];
  for(const key of ["checked","disabled"]){
   if(Object.getOwnPropertyDescriptor(input,key))continue;
   const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,key);
   Object.defineProperty(input,key,{configurable:true,get(){return d.get.call(this);},set(value){d.set.call(this,value);sync();}});descriptors.push(key);
  }
  input.addEventListener("change",sync);input.addEventListener("input",sync);
  // Effective fieldset disablement is read, never written to input.disabled.
  const observer=new MutationObserver(sync);
  observer.observe(input,{attributes:true,attributeFilter:["checked","disabled"]});
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:["disabled"]});
  const reset=()=>queueMicrotask(sync);document.addEventListener("reset",reset,true);
  el.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();if(!input.matches(":disabled"))input.click();queueMicrotask(sync);});
  // Consume decoration events, not the original checkbox's native events.
  el.addEventListener("input",event=>event.stopPropagation());el.addEventListener("change",event=>event.stopPropagation());
  let destroyed=false;
  const destroy=()=>{if(destroyed)return;destroyed=true;observer.disconnect();document.removeEventListener("reset",reset,true);input.removeEventListener("change",sync);input.removeEventListener("input",sync);for(const key of descriptors)delete input[key];input.classList.remove("ml-switch-source");for(const [key,value] of [["tabindex",saved.tabindex],["aria-hidden",saved.aria]])if(value===null)input.removeAttribute(key);else input.setAttribute(key,value);el.remove();};
  sync();return {control:el,destroy};
 }
 function progress(node){
  if(supported("md-linear-progress")){
   node.classList.remove("mdc-linear-progress","mdc-linear-progress--indeterminate");
   node.dataset.mlComponent="progress";
   const el=document.createElement("md-linear-progress");el.indeterminate=true;el.setAttribute("aria-hidden","true");node.replaceChildren(el);
   return {determinate:false,buffer:1,open(){},destroy(){el.remove();}};
  }
  if(window.MaterialMDC?.MDCLinearProgress)return new MaterialMDC.MDCLinearProgress(node);
  node.dataset.mlProgressFallback="true";node.textContent="";return {open(){},destroy(){}};
 }
 function enhance(root){
  if(root.closest?.("[data-ml-component]"))return;
  window.MaterialTextFields?.enhance(root);window.MaterialControls?.enhance(root);window.MaterialFeedback?.bind(root);window.MaterialExtras?.enhance(root);
 }
 window.MaterialComponents={button,switchControl,progress,enhance,isM3:m3};
})();
