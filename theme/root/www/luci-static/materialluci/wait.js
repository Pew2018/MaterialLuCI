"use strict";
/* MDC busy indication with explicit task lifecycles. LuCI owns all business
   operations; this module only mounts and removes presentation feedback. */
(function(){
 if(!window.MaterialMDC?.MDCLinearProgress){console.error("MaterialLuCI: local MDCLinearProgress failed to load; view progress cannot start.");document.documentElement.dataset.mlProgressError="true";return;}
 let overlay=null,modal=null,root=null,component=null,frame=0,resizeObserver=null;
 const tasks=new Map();let taskSeq=0;
 const t=(zh,en)=>document.documentElement.lang.startsWith("zh")?zh:en;
 const statusLabel=()=>t("正在处理，请稍候","Processing, please wait");
 function position(){if(!root||!modal||!overlay)return;const box=modal.getBoundingClientRect(),outer=overlay.getBoundingClientRect(),padding=innerWidth<600?18:24;root.style.left=(box.left-outer.left+padding)+"px";root.style.top=(box.bottom-outer.top-16)+"px";root.style.width=Math.max(0,box.width-padding*2)+"px";}
 function queuePosition(){position();if(!frame)frame=requestAnimationFrame(()=>{frame=0;position();});}
 function destroyNode(n){if(!n)return;n._mlComponent?.destroy();n.remove();}
 function stopTask(token){const task=tasks.get(token);if(!task)return;tasks.delete(token);destroyNode(task.node);if(task.host?.children.length===0&&(task.host!==task.scope||task.host.classList.contains("ml-view-progress")))task.host.remove();}
 function startTask(label,options={}){const scope=options.scope||document.getElementById("maincontent")||document.body;const node=document.createElement("div");node.className="mdc-linear-progress mdc-linear-progress--indeterminate ml-task-progress";node.setAttribute("role","progressbar");node.setAttribute("aria-label",label||statusLabel());node.setAttribute("aria-busy","true");const host=scope.matches?.(".ml-progress-host")?scope:document.createElement("div");if(host!==scope){host.className="ml-progress-host";scope.prepend(host);}host.prepend(node);node.innerHTML='<div class="mdc-linear-progress__buffer"><div class="mdc-linear-progress__buffer-bar"></div><div class="mdc-linear-progress__buffer-dots"></div></div><div class="mdc-linear-progress__bar mdc-linear-progress__primary-bar"><span class="mdc-linear-progress__bar-inner"></span></div><div class="mdc-linear-progress__bar mdc-linear-progress__secondary-bar"><span class="mdc-linear-progress__bar-inner"></span></div>';const instance=new MaterialMDC.MDCLinearProgress(node);node._mlComponent=instance;const token="task-"+(++taskSeq);tasks.set(token,{node,host,scope});instance.determinate=false;instance.buffer=1;instance.open();return {token,stop:()=>stopTask(token),update:(next)=>{if(next)node.setAttribute("aria-label",next);}};}
 function stopModal(){if(!root)return;component?.destroy();component=null;resizeObserver?.disconnect();resizeObserver=null;root.remove();root=null;if(modal){modal.classList.remove("ml-has-progress");const owns=modal.getAttribute("aria-owns")?.split(/\s+/).filter(id=>id!=="ml-mdc-wait-progress").join(" ");if(owns)modal.setAttribute("aria-owns",owns);else modal.removeAttribute("aria-owns");}}
 function sync(){const current=overlay?.querySelector(":scope>.modal"),shown=document.body.classList.contains("modal-overlay-active"),busy=shown&&current&&(current.classList.contains("spinning")||current.querySelector("p.spinning,div.spinning:not(.btn):not(.cbi-button)")),determinate=current?.querySelector('.cbi-progressbar,[role="progressbar"][aria-valuenow]');if(!busy||determinate){stopModal();return;}if(modal&&modal!==current)stopModal();modal=current;if(!modal.classList.contains("ml-has-progress"))modal.classList.add("ml-has-progress");if(!root){root=document.createElement("div");root.id="ml-mdc-wait-progress";root.className="mdc-linear-progress mdc-linear-progress--indeterminate ml-wait-progress";root.setAttribute("role","progressbar");root.setAttribute("aria-label",statusLabel());root.setAttribute("aria-valuemin","0");root.setAttribute("aria-valuemax","1");root.innerHTML='<div class="mdc-linear-progress__buffer"><div class="mdc-linear-progress__buffer-bar"></div><div class="mdc-linear-progress__buffer-dots"></div></div><div class="mdc-linear-progress__bar mdc-linear-progress__primary-bar"><span class="mdc-linear-progress__bar-inner"></span></div><div class="mdc-linear-progress__bar mdc-linear-progress__secondary-bar"><span class="mdc-linear-progress__bar-inner"></span></div>';overlay.append(root);position();component=new MaterialMDC.MDCLinearProgress(root);component.determinate=false;component.buffer=1;component.open();if(window.ResizeObserver){resizeObserver=new ResizeObserver(queuePosition);resizeObserver.observe(modal);}}const owns=new Set((modal.getAttribute("aria-owns")||"").split(/\s+/).filter(Boolean));owns.add(root.id);const value=[...owns].join(" ");if(modal.getAttribute("aria-owns")!==value)modal.setAttribute("aria-owns",value);queuePosition();}
 function observe(n){if(!n||n===overlay)return;stopModal();overlay=n;new MutationObserver(sync).observe(overlay,{childList:true,subtree:true,attributes:true,attributeFilter:["class","aria-busy"]});overlay.addEventListener("scroll",queuePosition,{passive:true});sync();}
 observe(document.getElementById("modal_overlay"));new MutationObserver(records=>{for(const record of records){if(record.type==="attributes")sync();for(const n of record.addedNodes)if(n.nodeType===1&&n.id==="modal_overlay")observe(n);}}).observe(document.body,{childList:true,attributes:true,attributeFilter:["class"]});
 window.addEventListener("materialluci:viewport",queuePosition);
 window.addEventListener("resize",queuePosition,{passive:true});window.visualViewport?.addEventListener("resize",queuePosition,{passive:true});window.visualViewport?.addEventListener("scroll",queuePosition,{passive:true});

 // LuCI View.__init__ inserts #view > .spinning, then replaces its
 // children only after load AND render resolve. Observe that structural
 // lifecycle, independent of locale and sidebar menu tasks.
 let viewTask=null,viewScope=null,failedScope=null;
 function stopView(){viewTask?.stop();viewTask=null;viewScope=null;}
 function syncView(records=[]){
  const scope=document.getElementById("view");
  // Only the view-level loader is a view load. A nested busy button, upload
  // or directory browser must never turn the whole page into a loading view.
  const busy=scope?.querySelector(":scope > .spinning:not(button):not(.btn):not(.cbi-button)");
  const failure=records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches(".alert-message.danger")||n.querySelector(".alert-message.danger"))));
  if(failure&&viewTask){failedScope=scope;stopView();}
  if(!busy){if(failedScope===scope)failedScope=null;stopView();return;}
  if(failedScope===scope)return;
  if(viewTask&&(viewScope!==scope||!scope.isConnected))stopView();
  if(!viewTask){
   viewScope=scope;
   // Mount outside #view: LuCI DOM.content() owns every child of #view.
   // This host stays visible while load/render replaces that content.
   const host=document.createElement("div");host.className="ml-progress-host ml-view-progress";
   scope.before(host);viewTask=startTask(t("正在载入视图","Loading view"),{scope:host});
  }
 }
 const viewObserver=new MutationObserver(syncView);
 // Observe replacement of #view and #maincontent as well as their children.
 viewObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
 syncView();
 window.addEventListener("unhandledrejection",()=>{if(viewTask){failedScope=viewScope;stopView();}});
 window.addEventListener("pagehide",()=>{stopView();for(const token of [...tasks.keys()])stopTask(token);stopModal();});

 window.MaterialWait={sync,isActive:()=>!!root,start:startTask,stop:stopTask,activeCount:()=>tasks.size};
})();