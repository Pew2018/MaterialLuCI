"use strict";
/* One discovery/removal queue; adapters retain their own local state observers. */
(function(){
 const layouts=[],adapters=[],added=new Set(),removed=new Set(),jobs=[],queued=new Map();
 let jobIndex=0,timer=0,stopped=false,started=false,geometryFrame=0;
 const geometryJobs=new Map(),sizes=new WeakMap(),sizeCallbacks=new WeakMap();
 const decorative=n=>!!n.matches?.("md-ripple,[data-ml-component],.mdc-button__ripple,.mdc-icon-button__ripple,.mdc-text-field__ripple,.mdc-line-ripple,.mdc-checkbox__background,.mdc-checkbox__ripple,.mdc-checkbox__focus-ring,.mdc-radio__background,.mdc-radio__ripple,.mdc-radio__focus-ring,.ml-mdc-menu,.mdc-tooltip,.mdc-snackbar,.ml-mdc-select,.ml-progress-host,.ml-view-progress")||!!n.closest?.("[data-ml-component],.ml-mdc-menu,.mdc-tooltip,.mdc-snackbar,.ml-mdc-select,.ml-view-progress,.ml-progress-host");
 function compact(set){const roots=[...set];set.clear();const members=new Set(roots);return roots.filter(n=>{for(let p=n.parentElement;p;p=p.parentElement)if(members.has(p))return false;return true;});}
 function schedule(){if(!timer&&!stopped)timer=setTimeout(flush,0);}
 function enqueue(a,node,run){
  let nodes=queued.get(a);if(!nodes){nodes=new WeakSet();queued.set(a,nodes);}
  if(nodes.has(node))return;nodes.add(node);
  jobs.push(()=>{nodes.delete(node);if(node.isConnected)run();});
 }
 // One discovery query per new subtree, then dispatch only matching adapters.
 // Never memoize a container as complete: later real fields must be found.
 const discovery={};
 function collect(root,initial=false){
  enqueue(discovery,root,()=>{
   const active=adapters.filter(a=>!initial||a.initial!==false);
   const selectors=[...new Set(active.map(a=>a.discoverSelector||a.selector).filter(Boolean))];
   const selector=selectors.join(",");
   if(!selector)return;
   const matchesRoot=!!root.matches?.(selector);
   // Polling often replaces a leaf status node. It cannot contain controls.
   // Still test the root itself so newly inserted native controls are found.
   if(!matchesRoot&&!root.children?.length)return;
   const candidates=(matchesRoot?[root]:[]).concat(root.children?.length?[...root.querySelectorAll(selector)]:[]).filter(n=>!decorative(n));
   if(!candidates.length)return;
   for(const a of active){
    const gate=a.discoverSelector||a.selector;
    const nodes=gate?candidates.filter(n=>n.matches(gate)):[];
    if(a.range){
     if(!gate||nodes.length)enqueue(a,root,()=>a.enhance(root));
     continue;
    }
    for(const n of nodes){
     if(!a.pending)a.pending=new WeakSet();
     if(a.pending.has(n))continue;a.pending.add(n);
     jobs.push(()=>{a.pending.delete(n);if(n.isConnected&&!decorative(n))a.enhance(n);});
    }
   }
  });
 }
 function flush(){
  timer=0;if(stopped)return;
  for(const n of compact(removed))if(!n.isConnected)for(const a of adapters)if(a.cleanup)jobs.push(()=>{if(!n.isConnected)a.cleanup(n);});
  for(const n of compact(added))if(n.isConnected&&!decorative(n))collect(n);
  const until=performance.now()+8;
  // Cooperative budget: a single selector query/component constructor cannot
  // be preempted. Avoid promising a hard maximum duration for a browser task.
  while(jobIndex<jobs.length&&performance.now()<until){const job=jobs[jobIndex++];try{job();}catch(error){console.error("MaterialLuCI enhancement failed",error);}}
  if(jobIndex===jobs.length){jobs.length=0;jobIndex=0;}
  if(jobs.length||added.size||removed.size)schedule();
 }
 function discover(records){
  if(stopped)return;
  // Mutation delivery precedes rendering; only registered layout classifiers
  // run here. Discovery and all component construction remain budgeted tasks.
  for(const prepare of layouts)try{prepare(records);}catch(error){console.error("MaterialLuCI layout preparation failed",error);}

  for(const r of records){
   if(decorative(r.target))continue;
   for(const n of r.addedNodes)if(n.nodeType===1&&!decorative(n))added.add(n);
   for(const n of r.removedNodes)if(n.nodeType===1&&!decorative(n))removed.add(n);
   // Replacing option text is handled by the select's local observer.
  }
  if(added.size||removed.size)schedule();
 }
 const observer=new MutationObserver(discover);
 function inRemoved(root,map,selector){
  const nodes=[...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)];
  for(const n of nodes){const entry=map.get(n);if(entry&&!n.isConnected)entry.destroy();}
 }
 function position(key,read,write){
  geometryJobs.set(key,{read,write});
  if(!geometryFrame)geometryFrame=requestAnimationFrame(()=>{
   geometryFrame=0;const batch=[...geometryJobs.values()];geometryJobs.clear();
   const values=batch.map(j=>j.read());batch.forEach((j,i)=>{if(values[i])j.write(values[i]);});
  });
 }
 const resize=new ResizeObserver(entries=>{
  for(const e of entries){const box=e.contentRect,previous=sizes.get(e.target),next=[box.width,box.height];if(previous&&previous[0]===next[0]&&previous[1]===next[1])continue;sizes.set(e.target,next);for(const cb of sizeCallbacks.get(e.target)||[])cb();}
 });
 function watchSize(root,callback){
  let callbacks=sizeCallbacks.get(root);if(!callbacks){callbacks=new Set();sizeCallbacks.set(root,callbacks);resize.observe(root);}callbacks.add(callback);
  return ()=>{callbacks.delete(callback);if(!callbacks.size){resize.unobserve(root);sizeCallbacks.delete(root);sizes.delete(root);}};
 }
 window.MaterialRuntime={registerLayout(prepare){layouts.push(prepare);},preparePending(){const records=observer.takeRecords();if(records.length)discover(records);},register(a){adapters.push(a);adapters.sort((a,b)=>(a.priority||0)-(b.priority||0));},start(root){if(started)return;started=true;collect(root,true);observer.observe(document.body,{childList:true,subtree:true});schedule();},cleanup:inRemoved,position,watchSize,dropPosition(key){geometryJobs.delete(key);},setStyle(el,key,value){if(el.style.getPropertyValue(key)!==value)el.style.setProperty(key,value);},setAttr(el,key,value){if(el.getAttribute(key)!==String(value))el.setAttribute(key,String(value));}};
 window.addEventListener("pagehide",event=>{
  if(event.persisted){clearTimeout(timer);timer=0;cancelAnimationFrame(geometryFrame);geometryFrame=0;return;}
  stopped=true;observer.disconnect();resize.disconnect();clearTimeout(timer);cancelAnimationFrame(geometryFrame);added.clear();removed.clear();jobs.length=0;geometryJobs.clear();
 });
 window.addEventListener("pageshow",event=>{if(event.persisted){if(jobs.length||added.size||removed.size)schedule();if(geometryJobs.size){const [key,j]=geometryJobs.entries().next().value;position(key,j.read,j.write);}}});
})();