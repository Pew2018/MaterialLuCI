"use strict";
/* Critical layout only. No component constructors, geometry reads or timers. */
(function(){
 const main=document.getElementById("maincontent");if(!main)return;
 const prepared=new WeakSet();let surfacePasses=0;
 const structural=".cbi-value,.cbi-section,.cbi-section-node,fieldset,section,.cbi-map,[data-tab-title],[data-table],.network-status-table,.ml-chart-surface,.ml-table-scroll,#view,table,.table";
 const decoration="[data-ml-component],.ml-progress-host,.ml-view-progress,.ml-mdc-select,.ml-mdc-menu,.mdc-tooltip,.mdc-snackbar,#ml-appearance,.ml-appearance-entry";
 const t=(zh,en)=>document.documentElement.lang.startsWith("zh")?zh:en;
 const node=(tag,attrs)=>{const el=document.createElement(tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));return el;};
 const isPlot=svg=>!!svg.querySelector("polyline,polygon")&&!!svg.querySelector("line,text")&&!svg.closest(".mdc-select,.mdc-button,.mdc-icon-button,.ml-icon-button,.ml-mdc-selection,.ml-toolbar,.ml-sidebar");
 function wrapTables(scope){
  // Includes live status div-tables as well as legacy Lua CBI tables.
  const tables=new Set([...(scope.matches?.("table,.table")?[scope]:[]),...scope.querySelectorAll("table,.table")]);const ancestor=scope.closest?.("table,.table");if(ancestor)tables.add(ancestor);
  for(const table of tables){
   // Firewall polling and jump links require heading.nextElementSibling and
   // chain.lastElementChild to remain the original table. Scroll its host.
   if(table.parentElement.matches("[data-chain]")){table.parentElement.classList.add("ml-chain-scroll");continue;}
   if(table.closest(".ml-table-scroll")||table.parentElement.closest("table,.table"))continue;
   const first=table.querySelector("tr,.tr"),cells=first?[...first.children].filter(c=>c.matches("td,th,.td,.th")).length:0;
   if(cells<3&&!table.classList.contains("cbi-section-table"))continue;
   const wrapper=node("div",{class:"ml-table-scroll",tabindex:0,role:"region","aria-label":t("表格，可横向滚动","Table, horizontally scrollable")});
   if(cells>=5)table.classList.add("ml-wide-table");
   table.parentNode.insertBefore(wrapper,table);wrapper.append(table);
  }

 }
 function updateSurfaces(scope=main){
  const all=selector=>[...(scope.matches?.(selector)?[scope]:[]),...scope.querySelectorAll(selector)];
  surfacePasses++;
  // SectionValue embeds complete sections inside field containers (flash,
  // backup and vendor pages). Mark those wrappers without moving native nodes.
  for(const value of all(".cbi-value")){
   const section=[...value.querySelectorAll(".cbi-section,fieldset")].find(el=>el.closest(".cbi-value")===value);
   if(value.classList.contains("ml-section-container")!==!!section)value.classList.toggle("ml-section-container",!!section);
  }


  for(const svg of all("#view svg"))if(isPlot(svg))svg.parentElement?.classList.add("ml-chart-surface");
  // Recognize the actual legacy flashops direct-child groups. Add only
  // presentation classes; forms, their children and business events stay put.
  for(const section of all(".cbi-section")){
   const heads=[...section.children].filter(el=>el.tagName==="H3");
   const legacy=!main.querySelector("#view")&&["flashops","flash"].includes(main.dataset.mlPage)&&heads.length>1;
   if(section.classList.contains("ml-legacy-flash-section")!==legacy)section.classList.toggle("ml-legacy-flash-section",legacy);
   if(!legacy)continue;
   const children=[...section.children];
   const roles=new Map();
   for(let i=0;i<heads.length;i++){
    const start=children.indexOf(heads[i]),end=i+1<heads.length?children.indexOf(heads[i+1]):children.length;
    const group=children.slice(start,end);roles.set(heads[i],"ml-legacy-card-start");
    group.slice(1).forEach((el,j)=>roles.set(el,j===group.length-2?"ml-legacy-card-end":"ml-legacy-card-body"));
   }
   for(const el of children)for(const cls of ["ml-legacy-card-start","ml-legacy-card-body","ml-legacy-card-end"])if(el.classList.contains(cls)!==(roles.get(el)===cls))el.classList.toggle(cls,roles.get(el)===cls);
  }
  const candidates=[...all(".cbi-section,.cbi-section-node,fieldset,section:not(.cbi-map):not(.ml-group),.cbi-map > [data-tab],.network-status-table,#view [data-table],.ml-chart-surface,#view > .ml-table-scroll,.cbi-map > .ml-table-scroll")]
   .filter(section=>{
    if(section.closest(".ml-legacy-flash-section"))return false;
    const option=section.closest(".cbi-value");
    return !section.closest("#ml-appearance,.modal,table,.table")&&
     (!option||option.classList.contains("ml-section-container"))&&
     !section.matches(".cbi-section-node:empty")&&section.id!=="view"&&
     // A container of SectionValues has no surface: each complete subsection does.
     !section.querySelector(".ml-section-container .cbi-section,.ml-section-container fieldset");
   });
  const candidateSet=new Set(candidates);
  const surfaces=new Set(candidates.filter(section=>{for(let p=section.parentElement;p&&p!==scope.parentElement;p=p.parentElement)if(candidateSet.has(p))return false;return true;}));
  // Flat views (reboot, SSH keys, firewall status, vendor views) have no CBI
  // section. Their existing content host owns the surface; never wrap children.
  const view=scope.id==="view"?scope:scope.querySelector("#view");
  if(view&&view.children.length&&!view.querySelector(":scope > .spinning,.cbi-map,.cbi-section,fieldset")&&!candidates.some(section=>view.contains(section)))surfaces.add(view);
  // Legacy Lua reboot templates render h2/p/hr/input directly without #view.
  // Keep their nodes and handlers in place; style the existing main surface.
  if(scope===main&&!view&&main.dataset.mlPage==="reboot"&&main.children.length&&[...main.children].some(el=>el.matches("h2,p,hr,form,input,button")))surfaces.add(main);
  for(const map of all(".cbi-map"))if(map.querySelector(".cbi-value")&&!map.querySelector(".ml-section-container")&&!candidates.some(section=>map.contains(section)))surfaces.add(map);
  all(".ml-card-surface").forEach(el=>{if(!surfaces.has(el))el.classList.remove("ml-card-surface");});
  if(scope===main&&main.classList.contains("ml-card-surface")&&!surfaces.has(main))main.classList.remove("ml-card-surface");
  for(const section of surfaces)if(!section.classList.contains("ml-card-surface"))section.classList.add("ml-card-surface");

 }

 function owner(n){
  if(!n||!main.contains(n))return null;
  let result=n.closest?.(".cbi-map,#view")||main;
  // A SectionValue may contain another map. Classify its outer owner together.
  for(let p=result.parentElement;p&&p!==main;p=p.parentElement)if(p.matches(".cbi-map"))result=p;
  return result;
 }
 function prepare(scope=main){
  if(!scope?.isConnected||!main.contains(scope))return;
  wrapTables(scope);updateSurfaces(scope);prepared.add(scope);
 }
 function prepareRecords(records){
  const roots=new Set();
  for(const r of records){
   if(!main.contains(r.target)||r.target.closest?.(decoration))continue;
   const elements=[...r.addedNodes,...r.removedNodes].filter(n=>n.nodeType===1&&!n.matches?.(decoration));
   if(!elements.length)continue;
   // Direct view replacement and genuine section/table structure matter;
   // polling text, table cells, clocks and SVG path updates do not.
   const table=r.target.closest?.("table,.table");
   const unpreparedTable=table&&!table.closest(".ml-table-scroll,[data-chain]");
   const firstRow=unpreparedTable?table.querySelector("tr,.tr"):null;
   const firstRows=unpreparedTable&&firstRow&&
    (r.target===firstRow||elements.includes(firstRow))&&[...firstRow.children].filter(n=>n.matches("td,th,.td,.th")).length>=3;
   const svg=r.target.closest?.("svg");
   // Classified plot internals cannot change card ownership. Still let runtime
   // independently discover any real fields inserted outside those SVGs.
   if(svg?.parentElement?.classList.contains("ml-chart-surface"))continue;
   const firstPlot=svg&&!svg.parentElement?.classList.contains("ml-chart-surface")&&isPlot(svg);
   // Reuse one structural/plot discovery per changed subtree.
   const candidates=elements.flatMap(n=>[...(n.matches(structural+",svg")?[n]:[]),...n.querySelectorAll(structural+",svg")]).filter(n=>!n.closest?.(decoration));
   const newPlot=!svg&&candidates.some(plot=>plot.matches("svg")&&!plot.parentElement?.classList.contains("ml-chart-surface")&&isPlot(plot));
   if(r.target.id==="view"||r.target===main||firstRows||firstPlot||newPlot||candidates.some(n=>n.matches(structural))){
    const root=owner(r.target);if(root)roots.add(root);
   }
  }
  for(const root of roots)if(root.isConnected&&![...roots].some(p=>p!==root&&p.contains(root)))prepare(root);
 }
 MaterialRuntime.registerLayout(prepareRecords);
 window.MaterialSurfaces={prepare,ensure(scope){MaterialRuntime.preparePending();if(scope?.isConnected&&!prepared.has(scope))try{prepare(scope);}catch(error){console.error("MaterialLuCI layout preparation failed",error);return false;}return true;},count:()=>surfacePasses};
})();
