"use strict";
/* MDC busy indication with explicit task lifecycles. LuCI owns all business
   operations; this module only mounts and removes presentation feedback. */
(function(){
 let overlay=null,modal=null,root=null,component=null,frame=0,resizeObserver=null,followUntil=0,modalObserver=null,viewNode=null,viewObserver=null,viewStateObserver=null,stopped=false;
 const abort=new AbortController(),moving=new Set();
 const tasks=new Map();let taskSeq=0;
 const t=(zh,en)=>document.documentElement.lang.startsWith("zh")?zh:en;
 const statusLabel=()=>t("正在处理，请稍候","Processing, please wait");
 const geometryProperties=new Set(["transform","translate","scale","top","left","margin-top","margin-left"]);
 function position(){
  frame=0;if(stopped||!root||!modal||!overlay)return;
  const box=modal.getBoundingClientRect(),outer=overlay.getBoundingClientRect(),padding=innerWidth<600?18:24;
  MaterialRuntime.setStyle(root,"left",(box.left-outer.left+padding)+"px");
  MaterialRuntime.setStyle(root,"top",(box.bottom-outer.top-(MaterialComponents.isM3()?28:16))+"px");
  MaterialRuntime.setStyle(root,"width",Math.max(0,box.width-padding*2)+"px");
  if(moving.size&&performance.now()<followUntil)frame=requestAnimationFrame(position);
 }
 function queuePosition(){if(!stopped&&root&&modal&&overlay&&!frame)frame=requestAnimationFrame(position);}
 function motion(event){
  if(event.target!==modal||!geometryProperties.has(event.propertyName))return;
  if(event.type==="transitionrun"){moving.add(event.propertyName);followUntil=performance.now()+600;}
  else moving.delete(event.propertyName);
  queuePosition();
 }
 function destroyNode(n){if(!n)return;n._mlComponent?.destroy();n.remove();}
 function stopTask(token){const task=tasks.get(token);if(!task)return;tasks.delete(token);destroyNode(task.node);if(task.host?.children.length===0&&(task.host!==task.scope||task.host.classList.contains("ml-view-progress")))task.host.remove();}
 function startTask(label,options={}){const scope=options.scope||document.getElementById("maincontent")||document.body;const node=document.createElement("div");node.className="mdc-linear-progress mdc-linear-progress--indeterminate ml-task-progress";node.setAttribute("role","progressbar");node.setAttribute("aria-label",label||statusLabel());node.setAttribute("aria-busy","true");const host=scope.matches?.(".ml-progress-host")?scope:document.createElement("div");if(host!==scope){host.className="ml-progress-host";scope.prepend(host);}host.prepend(node);node.innerHTML='<div class="mdc-linear-progress__buffer"><div class="mdc-linear-progress__buffer-bar"></div><div class="mdc-linear-progress__buffer-dots"></div></div><div class="mdc-linear-progress__bar mdc-linear-progress__primary-bar"><span class="mdc-linear-progress__bar-inner"></span></div><div class="mdc-linear-progress__bar mdc-linear-progress__secondary-bar"><span class="mdc-linear-progress__bar-inner"></span></div>';const instance=MaterialComponents.progress(node,{scene:options.scene});node._mlComponent=instance;const token="task-"+(++taskSeq);tasks.set(token,{node,host,scope});instance.determinate=false;instance.buffer=1;instance.open();return {token,stop:()=>stopTask(token),update:(next)=>{if(next)node.setAttribute("aria-label",next);}};}
 function stopModal(){moving.clear();followUntil=0;if(frame){cancelAnimationFrame(frame);frame=0;}if(!root)return;component?.destroy();component=null;resizeObserver?.disconnect();resizeObserver=null;root.remove();root=null;if(modal){modal.classList.remove("ml-has-progress");const owns=modal.getAttribute("aria-owns")?.split(/\s+/).filter(id=>id!=="ml-mdc-wait-progress").join(" ");if(owns)modal.setAttribute("aria-owns",owns);else modal.removeAttribute("aria-owns");}}
 function sync(){const current=overlay?.querySelector(":scope>.modal"),shown=document.body.classList.contains("modal-overlay-active"),busy=shown&&current&&(current.classList.contains("spinning")||current.querySelector("p.spinning,div.spinning:not(.btn):not(.cbi-button)")),determinate=current?.querySelector('.cbi-progressbar,[role="progressbar"][aria-valuenow]');if(!busy||determinate){stopModal();return;}if(modal&&modal!==current)stopModal();modal=current;if(!modal.classList.contains("ml-has-progress"))modal.classList.add("ml-has-progress");if(!root){root=document.createElement("div");root.id="ml-mdc-wait-progress";root.className="mdc-linear-progress mdc-linear-progress--indeterminate ml-wait-progress";root.setAttribute("role","progressbar");root.setAttribute("aria-label",statusLabel());root.setAttribute("aria-valuemin","0");root.setAttribute("aria-valuemax","1");root.innerHTML='<div class="mdc-linear-progress__buffer"><div class="mdc-linear-progress__buffer-bar"></div><div class="mdc-linear-progress__buffer-dots"></div></div><div class="mdc-linear-progress__bar mdc-linear-progress__primary-bar"><span class="mdc-linear-progress__bar-inner"></span></div><div class="mdc-linear-progress__bar mdc-linear-progress__secondary-bar"><span class="mdc-linear-progress__bar-inner"></span></div>';overlay.append(root);position();component=MaterialComponents.progress(root,{scene:"modal"});component.determinate=false;component.buffer=1;component.open();if(window.ResizeObserver){resizeObserver=new ResizeObserver(queuePosition);resizeObserver.observe(modal);}}const owns=new Set((modal.getAttribute("aria-owns")||"").split(/\s+/).filter(Boolean));owns.add(root.id);const value=[...owns].join(" ");if(modal.getAttribute("aria-owns")!==value)modal.setAttribute("aria-owns",value);queuePosition();}
 const busySelector="p.spinning,div.spinning:not(.btn):not(.cbi-button),.cbi-progressbar,[role=progressbar]";
 function relevantModal(record){
  if(record.target.closest?.("[data-ml-component=progress],.ml-wait-progress"))return false;
  if(record.type==="attributes"){
   if(record.target===modal||record.target.parentElement===overlay)return true;
   if(record.attributeName==="aria-busy")return true;
   return record.target.matches?.(busySelector)||(record.target.matches?.("p,div:not(.btn):not(.cbi-button)")&&record.oldValue?.split(/\s+/).includes("spinning"));
  }
  if(record.target===overlay||record.target===modal)return true;
  return [...record.addedNodes,...record.removedNodes].some(n=>n.nodeType===1&&(n.matches?.(busySelector)||n.querySelector?.(busySelector)));
 }
 function observe(n){
  if(stopped||!n||n===overlay)return;
  stopModal();modalObserver?.disconnect();
  if(overlay){overlay.removeEventListener("scroll",queuePosition);for(const event of ["transitionrun","transitionend","transitioncancel"])overlay.removeEventListener(event,motion,true);}
  overlay=n;
  modalObserver=new MutationObserver(records=>{if(records.some(relevantModal))sync();});
  modalObserver.observe(overlay,{childList:true,subtree:true,attributes:true,attributeOldValue:true,attributeFilter:["class","aria-busy"]});
  overlay.addEventListener("scroll",queuePosition,{passive:true});
  for(const event of ["transitionrun","transitionend","transitioncancel"])overlay.addEventListener(event,motion,true);
  sync();
 }
 let shown=document.body.classList.contains("modal-overlay-active");
 const visibilityObserver=new MutationObserver(()=>{
  const next=document.body.classList.contains("modal-overlay-active");
  if(next!==shown){shown=next;sync();}
 });
 visibilityObserver.observe(document.body,{attributes:true,attributeFilter:["class"]});
 observe(document.getElementById("modal_overlay"));
 for(const [target,event] of [[window,"materialluci:viewport"],[window,"resize"],[window.visualViewport,"resize"],[window.visualViewport,"scroll"]])target?.addEventListener(event,queuePosition,{passive:true,signal:abort.signal});

 // LuCI View.__init__ inserts #view > .spinning, then replaces its
 // children only after load AND render resolve. Observe that structural
 // lifecycle, independent of locale and sidebar menu tasks.
 let viewTask=null,viewScope=null,failedScope=null,failedLoader=null;
 const viewPromises=new WeakMap();let viewPrototype=null,originalInit=null,trackedInit=null;
 function installViewTracking(){
  const proto=window.L?.view?.prototype;if(!proto||typeof proto.__init__!=="function"||viewPrototype)return;
  viewPrototype=proto;originalInit=proto.__init__;
  trackedInit=function(){
   const result=originalInit.apply(this,arguments),scope=document.getElementById("view"),loader=scope?.querySelector(":scope > .spinning:not(button):not(.btn):not(.cbi-button)");
   if(result&&typeof result==="object"&&loader)viewPromises.set(result,{scope,loader});
   return result;
  };
  proto.__init__=trackedInit;
 }
 // Native setup waits for DOMContentLoaded before instantiating view classes.
 // Track identity only: do not attach a catch or alter the business promise.
 installViewTracking();document.addEventListener("DOMContentLoaded",installViewTracking,{once:true,signal:abort.signal});
 function stopView(){viewScope?.classList.remove("ml-view-loading");viewTask?.stop();viewTask=null;viewScope=null;}
 function syncView(records=[]){
  const scope=document.getElementById("view");
  // Only the view-level loader is a view load. A nested busy button, upload
  // or directory browser must never turn the whole page into a loading view.
  const busy=scope?.querySelector(":scope > .spinning:not(button):not(.btn):not(.cbi-button)");
  if(!busy){if(viewTask&&scope?.isConnected)window.MaterialSurfaces?.ensure(scope);if(failedScope===scope)failedScope=null;stopView();return;}
  if(failedScope===scope&&failedLoader===busy)return;
  if(failedScope){failedScope=null;failedLoader=null;}
  if(viewTask&&(viewScope!==scope||!scope.isConnected))stopView();
  if(!viewTask){
   viewScope=scope;scope.classList.add("ml-view-loading");
   // Mount outside #view: LuCI DOM.content() owns every child of #view.
   // This host stays visible while load/render replaces that content.
   const host=document.createElement("div");host.className="ml-progress-host ml-view-progress";
   scope.before(host);viewTask=startTask(t("正在载入视图","Loading view"),{scope:host,scene:"view"});
  }
 }
 function observeView(n){
  if(stopped||n===viewNode)return;
  viewObserver?.disconnect();viewStateObserver?.disconnect();viewNode=n;
  if(n){
   const watchDirectChildren=()=>{viewStateObserver.disconnect();for(const child of n.children)viewStateObserver.observe(child,{attributes:true,attributeOldValue:true,attributeFilter:["class"]});};
   viewStateObserver=new MutationObserver(records=>{if(records.some(r=>r.target.classList.contains("spinning")||r.oldValue?.split(/\s+/).includes("spinning")))syncView();});
   watchDirectChildren();
   viewObserver=new MutationObserver(records=>{
    if(records.some(r=>r.target===viewNode))watchDirectChildren();
    const relevant=records.filter(r=>{
     if(r.target.closest?.("[data-ml-component=progress],.ml-view-progress,.ml-progress-host"))return false;
     if(r.target===viewNode)return true;
     return false;
    });
    if(relevant.length)syncView(relevant);
   });
   viewObserver.observe(n,{childList:true,subtree:true});
  }
  syncView();
 }
 MaterialRuntime.register({range:true,discoverSelector:'#view,#modal_overlay',priority:-30,enhance(n){
  if(n.id==="modal_overlay")observe(n);else if(!overlay?.isConnected){const candidate=n.querySelector?.("#modal_overlay");if(candidate)observe(candidate);}
  if(n.id==="view")observeView(n);else if(!viewNode?.isConnected){const candidate=n.querySelector?.("#view");if(candidate)observeView(candidate);}
 },cleanup(n){
  if(overlay&&!overlay.isConnected&&(n===overlay||n.contains(overlay))){stopModal();modalObserver?.disconnect();overlay=null;modal=null;}
  if(viewNode&&!viewNode.isConnected&&(n===viewNode||n.contains(viewNode)))observeView(document.getElementById("view"));
  for(const [token,task] of tasks)if(!task.scope.isConnected&&(n===task.scope||n.contains(task.scope)))stopTask(token);
 }});
 observeView(document.getElementById("view"));
 window.addEventListener("unhandledrejection",event=>{
  const task=viewPromises.get(event.promise);
  if(task&&task.scope===document.getElementById("view")&&task.loader.parentElement===task.scope&&task.loader.classList.contains("spinning")){failedScope=task.scope;failedLoader=task.loader;stopView();}
 },{signal:abort.signal});
 window.addEventListener("pagehide",event=>{
  if(frame){cancelAnimationFrame(frame);frame=0;}
  if(event.persisted)return;
  stopped=true;abort.abort();if(viewPrototype?.__init__===trackedInit)viewPrototype.__init__=originalInit;visibilityObserver.disconnect();viewObserver?.disconnect();viewStateObserver?.disconnect();modalObserver?.disconnect();
  stopView();for(const token of [...tasks.keys()])stopTask(token);stopModal();
  if(overlay){overlay.removeEventListener("scroll",queuePosition);for(const event of ["transitionrun","transitionend","transitioncancel"])overlay.removeEventListener(event,motion,true);}
 });
 window.addEventListener("pageshow",event=>{if(event.persisted){syncView();sync();queuePosition();}});

 window.MaterialWait={sync,isActive:()=>!!root,start:startTask,stop:stopTask,activeCount:()=>tasks.size};
})();