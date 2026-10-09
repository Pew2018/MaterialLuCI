"use strict";
/* Busy indication only. Do not replace LuCI apply, rollback, RPC or modal APIs.
   Stable overlay sibling: upstream opkg removes dlg.lastChild, while UCI
   replaces the modal contents once a second. Neither may remove/restart MDC. */
(function(){
 if(!window.MaterialMDC?.MDCLinearProgress)return;
 let overlay=null,modal=null,root=null,component=null,frame=0,resizeObserver=null;
 const statusLabel=()=>document.documentElement.lang.startsWith("zh")?"正在处理，请稍候":"Processing, please wait";
 function position(){
  frame=0;if(!root||!modal||!overlay)return;
  const box=modal.getBoundingClientRect(),outer=overlay.getBoundingClientRect(),padding=innerWidth<600?18:24;
  root.style.left=(box.left-outer.left+padding)+"px";
  root.style.top=(box.bottom-outer.top-16)+"px";
  root.style.width=Math.max(0,box.width-padding*2)+"px";
 }
 function queuePosition(){if(!frame)frame=requestAnimationFrame(position);}
 function stop(){
  if(!root)return;
  component?.destroy();component=null;resizeObserver?.disconnect();resizeObserver=null;
  root.remove();root=null;
  if(modal){modal.classList.remove("ml-has-progress");const owns=modal.getAttribute("aria-owns")?.split(/\s+/).filter(id=>id!=="ml-mdc-wait-progress").join(" ");if(owns)modal.setAttribute("aria-owns",owns);else modal.removeAttribute("aria-owns");}
 }
 function sync(){
  const current=overlay?.querySelector(":scope>.modal");
  const shown=document.body.classList.contains("modal-overlay-active");
  // Explicit lifecycle markers only; do not infer work from translated strings.
  const busy=shown&&current&&(current.classList.contains("spinning")||current.querySelector("p.spinning,div.spinning:not(.btn):not(.cbi-button)"));
  const determinate=current?.querySelector('.cbi-progressbar,[role="progressbar"][aria-valuenow]');
  if(!busy||determinate){stop();return;}
  if(modal&&modal!==current)stop();modal=current;
  if(!modal.classList.contains("ml-has-progress"))modal.classList.add("ml-has-progress");
  if(!root){
   root=document.createElement("div");root.id="ml-mdc-wait-progress";
   root.className="mdc-linear-progress mdc-linear-progress--indeterminate ml-wait-progress";
   root.setAttribute("role","progressbar");root.setAttribute("aria-label",statusLabel());root.setAttribute("aria-valuemin","0");root.setAttribute("aria-valuemax","1");
   root.innerHTML='<div class="mdc-linear-progress__buffer"><div class="mdc-linear-progress__buffer-bar"></div><div class="mdc-linear-progress__buffer-dots"></div></div><div class="mdc-linear-progress__bar mdc-linear-progress__primary-bar"><span class="mdc-linear-progress__bar-inner"></span></div><div class="mdc-linear-progress__bar mdc-linear-progress__secondary-bar"><span class="mdc-linear-progress__bar-inner"></span></div>';
   overlay.append(root);position();
   component=new MaterialMDC.MDCLinearProgress(root);component.determinate=false;component.buffer=1;component.open();
   if(window.ResizeObserver){resizeObserver=new ResizeObserver(queuePosition);resizeObserver.observe(modal);}
  }
  const owns=new Set((modal.getAttribute("aria-owns")||"").split(/\s+/).filter(Boolean));owns.add(root.id);
  const value=[...owns].join(" ");if(modal.getAttribute("aria-owns")!==value)modal.setAttribute("aria-owns",value);
  queuePosition();
 }
 function observe(node){
  if(!node||node===overlay)return;
  stop();overlay=node;
  new MutationObserver(sync).observe(overlay,{childList:true,subtree:true,attributes:true,attributeFilter:["class","aria-busy"]});
  overlay.addEventListener("scroll",queuePosition,{passive:true});sync();
 }
 observe(document.getElementById("modal_overlay"));
 new MutationObserver(records=>{
  for(const record of records){if(record.type==="attributes")sync();for(const node of record.addedNodes)if(node.nodeType===1&&node.id==="modal_overlay")observe(node);}
 }).observe(document.body,{childList:true,attributes:true,attributeFilter:["class"]});
 window.addEventListener("resize",queuePosition,{passive:true});
 window.visualViewport?.addEventListener("resize",queuePosition,{passive:true});
 window.visualViewport?.addEventListener("scroll",queuePosition,{passive:true});
 window.MaterialWait={sync,isActive:()=>!!root};
})();
