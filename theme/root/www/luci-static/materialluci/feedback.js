"use strict";
/* Original elements and LuCI handlers remain authoritative. MDC owns the ink. */
(function(){
 const {MDCRipple,MDCRippleFoundation}=MaterialMDCControls;
 const entries=new Map(),pending=new WeakMap(),reduced=matchMedia("(prefers-reduced-motion: reduce)");
 const disabledWatchers=new Map();
 const disabledObserver=new MutationObserver(records=>{for(const [el,sync] of disabledWatchers)if(records.some(r=>r.target===el||r.target.contains(el)||el.contains(r.target)))sync();});
 disabledObserver.observe(document.body,{attributes:true,subtree:true,attributeFilter:["disabled","aria-disabled"]});
 const selector="button:not(.mdc-switch),div.btn,a.btn,a.cbi-button,a.text-action,.ml-poll-action,.ml-native-button,.ml-sidebar a,.tabs a,.cbi-tabmenu a";
 function disabled(el){return !!(el.matches(":disabled")||el.disabled||el.hasAttribute("disabled")||el.querySelector("input:disabled")||el.closest('[aria-disabled="true"]'));}
 function scrolls(el){const list=[];for(let n=el.parentElement;n;n=n.parentElement)if(n.scrollHeight>n.clientHeight||n.scrollWidth>n.clientWidth)list.push([n,n.scrollTop,n.scrollLeft]);return list;}
 // MDC's supported foundation adapter supplies confirmed-tap activation.
 // It suppresses the default pointerdown/compatibility-mouse listeners, so
 // touch scrolling and one physical tap retain the previous theme behavior.
 class ConfirmedRipple extends MDCRipple{
  getDefaultFoundation(){
   const adapter=MDCRipple.createAdapter(this);
   return new MDCRippleFoundation({...adapter,isSurfaceDisabled:()=>disabled(this.root)||reduced.matches,
    registerInteractionHandler:(type,handler)=>{if(type==="focus"||type==="blur")adapter.registerInteractionHandler(type,handler);},
    deregisterInteractionHandler:(type,handler)=>{if(type==="focus"||type==="blur")adapter.deregisterInteractionHandler(type,handler);},
    registerDocumentInteractionHandler:()=>{},deregisterDocumentInteractionHandler:()=>{}
   });
  }
  confirmed(event){this.foundation.activate(event);this.foundation.deactivate();}
 }
 function mark(el){
  const icon=el.matches(".ml-icon-button,.ml-poll-action");
  el.classList.add("ml-mdc-feedback");
  if(icon)el.classList.add("mdc-icon-button");
  else if(el.matches("button,div.btn,a.btn,a.cbi-button,a.text-action,.ml-native-button"))el.classList.add("mdc-button");
  else el.classList.add("mdc-ripple-surface");
  // Append after business children: LuCI owns firstChild and sibling contracts.
  const cls=icon?"mdc-icon-button__ripple":el.classList.contains("mdc-button")?"mdc-button__ripple":null;
  if(cls&&!el.querySelector(":scope > ."+cls)){const layer=document.createElement("span");layer.className=cls;layer.setAttribute("aria-hidden","true");if(el.matches(".cbi-dropdown"))el.insertBefore(layer,el.lastElementChild);else el.append(layer);}
  if(el.matches("button")&&el.firstElementChild?.tagName==="SPAN"&&!el.firstElementChild.matches(".mdc-button__ripple,.mdc-icon-button__ripple,.ml-radio"))el.firstElementChild.classList.add("mdc-button__label");
 }
 function bind(el){
  // The title and chevron have separate state layers; a parent ripple joins them.
  if(el.matches("button.ml-nav-parent"))return;
  if(el.closest(".mdc-switch,.ml-mdc-selection"))return;
  if(el.matches("button")&&el.closest(".ml-native-button"))return;
  if(!entries.has(el)&&window.__mlControlAudit&&el.isConnected){const s=getComputedStyle(el),r=el.getBoundingClientRect();el._mlBeforeMDC={width:r.width,height:r.height,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,color:s.color,radius:s.borderRadius,firstChild:el.firstChild};}
  if(entries.has(el))return;
  if(MaterialComponents.isM3()&&customElements.get("md-ripple")){
   const layer=document.createElement("md-ripple");layer.dataset.mlComponent="ripple";
   el.classList.add("ml-m3-feedback");el.dataset.rippleOwner="m3";
   // Avoid .open sibling contracts on compound LuCI apply buttons.
   if(el.matches(".cbi-dropdown"))el.insertBefore(layer,el.lastElementChild);else el.append(layer);
   layer.attach(el.matches(".ml-native-button")?el.querySelector("input,button"):el);
   const sync=()=>{layer.disabled=disabled(el)||reduced.matches;};
   disabledWatchers.set(el,sync);const attrs={disconnect(){disabledWatchers.delete(el);}};
   reduced.addEventListener("change",sync);sync();
   entries.set(el,{destroy(){attrs.disconnect();reduced.removeEventListener("change",sync);layer.detach();layer.remove();el.classList.remove("ml-m3-feedback");entries.delete(el);}});
   return;
  }
  mark(el);
  el.dataset.ripple="control";el.dataset.rippleOwner="mdc";
  const instance=new ConfirmedRipple(el);el._mlMdcRipple=instance;
  // Bounded ink keeps existing rectangular hit areas and sidebar feedback.
  const abort=new AbortController(),options={passive:true,signal:abort.signal};
  el.addEventListener("pointerdown",event=>{
   if(!event.isPrimary||event.button!==0||disabled(el))return;
   pending.set(el,{id:event.pointerId,x:event.clientX,y:event.clientY,event,scrolls:scrolls(el)});
  },options);
  el.addEventListener("pointercancel",()=>pending.delete(el),options);
  el.addEventListener("pointerup",event=>{
   const p=pending.get(el);pending.delete(el);
   if(!p||p.id!==event.pointerId||disabled(el)||reduced.matches)return;
   if(Math.hypot(event.clientX-p.x,event.clientY-p.y)>(event.pointerType==="mouse"?8:10)||p.scrolls.some(([n,y,x])=>Math.abs(n.scrollTop-y)>2||Math.abs(n.scrollLeft-x)>2))return;
   const rect=el.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)return;
   instance.confirmed(p.event);
  },options);
  el.addEventListener("keydown",event=>{if((event.key==="Enter"||event.key===" ")&&!event.repeat&&!disabled(el)&&!reduced.matches)instance.activate();},{signal:abort.signal});
  el.addEventListener("keyup",event=>{if(event.key==="Enter"||event.key===" ")instance.deactivate();},{signal:abort.signal});
  const resize=new ResizeObserver(()=>instance.layout());resize.observe(el);
  entries.set(el,{destroy(){abort.abort();resize.disconnect();instance.destroy();el._mlMdcRipple=null;pending.delete(el);entries.delete(el);}});
 }
 function enhance(root=document){
  if(root.matches?.(selector))bind(root);
  root.querySelectorAll?.(selector).forEach(bind);
 }
 let scheduled=false;const roots=new Set();
 new MutationObserver(records=>{
  for(const record of records){const target=record.target.closest?.(selector);if(target)roots.add(target);for(const n of record.addedNodes)if(n.nodeType===1&&!n.matches(".mdc-button__ripple,.mdc-icon-button__ripple,md-ripple"))roots.add(n);}
  for(const [el,entry] of entries)if(!el.isConnected)entry.destroy();
  if(roots.size&&!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;for(const n of roots)if(n.isConnected)enhance(n);roots.clear();});}
 }).observe(document.body,{childList:true,subtree:true});
 window.addEventListener("pagehide",event=>{if(!event.persisted)for(const entry of [...entries.values()])entry.destroy();});
 window.MaterialFeedback={bind:enhance,counts:()=>({instances:entries.size,disabledWatchers:disabledWatchers.size})};enhance();
})();
