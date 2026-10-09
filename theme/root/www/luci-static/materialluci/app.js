"use strict";
/* Presentation adapters. Original LuCI inputs, form handlers and RPC remain authoritative. */
(function(){
 const appearance=window.MaterialAppearance,main=document.getElementById("maincontent"),content=document.getElementById("page-content"),back=document.getElementById("ml-back");
 if(!main||!appearance)return;
 const zh=document.documentElement.lang.startsWith("zh"),t=(cn,en)=>zh?cn:en;
 const node=(tag,attrs={},children=[])=>{const el=document.createElement(tag);for(const [key,val] of Object.entries(attrs)){if(key==="text")el.textContent=val;else if(key==="class")el.className=val;else el.setAttribute(key,String(val));}for(const child of children)el.append(child);return el;};
 const textButton=(text,fn,cls="text-action")=>{const b=node("button",{type:"button",class:cls},[node("span",{text})]);b.addEventListener("click",fn);return b;};
 let menus=null,dialog=null,appearancePage=null,hiddenBefore=[],scrollBefore=0,previousFocus=null,menuError="";
 let sequence=0;
 const nativeBack=()=>{if(history.state&&history.state.materialluci)history.back();};
 function finishDialog(){
  if(!dialog)return;const old=dialog;dialog=null;content.style.overflow=old.overflow;
  const done=()=>{old.backdrop.remove();if(old.focus&&old.focus.isConnected)old.focus.focus({preventScroll:true});};
  if(matchMedia("(prefers-reduced-motion: reduce)").matches||!old.backdrop.animate){done();return;}
  old.backdrop.animate([{opacity:1},{opacity:0}],{duration:100,easing:"ease-in"}).finished.catch(()=>{}).then(done);
 }
 function closeDialog(){if(!dialog)return;if(history.state&&history.state.materialluci==="dialog"&&history.state.id===dialog.id)history.back();else finishDialog();}
 function openDialog(title,body){
  if(dialog)return;
  const id=++sequence,heading=node("h2",{id:"ml-dialog-title-"+id,text:title}),panel=node("div",{class:"ml-dialog",role:"dialog","aria-modal":"true","aria-labelledby":heading.id},[heading,body]);
  const cancel=textButton(t("取消","Cancel"),closeDialog);panel.append(node("div",{class:"ml-dialog-actions"},[cancel]));
  const bg=node("div",{class:"ml-backdrop"},[panel]);dialog={id,backdrop:bg,focus:document.activeElement,overflow:content.style.overflow};
  content.style.overflow="hidden";document.body.append(bg);history.pushState({materialluci:"dialog",id},"",location.href);
  bg.addEventListener("click",e=>{if(e.target===bg)closeDialog();});
  bg.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();closeDialog();}if(e.key==="Tab"){const fs=[...panel.querySelectorAll("button:not(:disabled),a[href],input:not(:disabled),summary")];if(!fs.length)return;const first=fs[0],last=fs[fs.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  MaterialFeedback.bind(bg);
  if(!matchMedia("(prefers-reduced-motion: reduce)").matches&&bg.animate){bg.animate([{opacity:0},{opacity:1}],{duration:160,easing:"ease-out"});panel.animate([{transform:"translateY(4px)"},{transform:"translateY(0)"}],{duration:160,easing:"ease-out"});}
  (panel.querySelector("button,a[href],summary")||cancel).focus({preventScroll:true});
 }
 function choose(title,options,value,onChange){
  const body=node("div",{role:"radiogroup","aria-label":title});
  for(const [key,label] of options){const b=node("button",{type:"button",class:"ml-option",role:"radio","aria-checked":key===value},[node("span",{text:label}),node("span",{class:"ml-radio","aria-hidden":"true"})]);
   b.addEventListener("click",()=>{if(!dialog)return;body.querySelectorAll("[aria-checked]").forEach(e=>e.setAttribute("aria-checked",String(e===b)));onChange(key);const id=dialog.id;setTimeout(()=>{if(dialog&&dialog.id===id)closeDialog();},150);});body.append(b);
  }openDialog(title,body);
 }
 function closeAppearance(){
  if(!appearancePage)return;appearancePage.remove();appearancePage=null;
  hiddenBefore.forEach(([el,hidden])=>{if(el.isConnected)el.hidden=hidden;});hiddenBefore=[];
  content.scrollTop=scrollBefore;back.hidden=true;
  document.querySelectorAll(".ml-bottom-tab").forEach(b=>b.disabled=false);
  if(previousFocus&&previousFocus.isConnected)previousFocus.focus({preventScroll:true});
 }
 function row(title,description,control){return node("div",{class:"ml-setting-row"},[node("span",{class:"ml-row-copy"},[node("strong",{text:title}),node("small",{text:description})]),control]);}
 function prefSwitch(key,title,description){
  const input=node("input",{type:"checkbox",class:"ml-switch",role:"switch","aria-label":title});input.checked=appearance.prefs[key];input.addEventListener("change",()=>appearance.set(key,input.checked));
  return row(title,description,node("label",{class:"ml-switch-hit"},[input]));
 }
 function openAppearance(){
  if(dialog){closeDialog();return;}if(appearancePage)return;
  previousFocus=document.activeElement;scrollBefore=content.scrollTop;hiddenBefore=[...main.children].map(el=>[el,el.hidden]);hiddenBefore.forEach(([el])=>el.hidden=true);
  const host=node("section",{id:"ml-appearance"});appearancePage=host;main.append(host);back.hidden=false;content.scrollTop=0;
  history.pushState({materialluci:"appearance"},"",location.href);
  const group=title=>{const g=node("section",{class:"ml-group"},[node("h2",{text:title})]);host.append(g);return g;};
  const general=group(t("界面","Appearance"));
  const modeLabels={system:t("跟随系统","System"),light:t("浅色","Light"),dark:t("深色","Dark")};
  const mode=textButton(modeLabels[appearance.prefs.mode],()=>choose(t("显示模式","Display mode"),Object.entries(modeLabels),appearance.prefs.mode,v=>{appearance.set("mode",v);mode.firstChild.textContent=modeLabels[v];}),"ml-choice");
  general.append(row(t("显示模式","Display mode"),t("仅改变当前浏览器的界面外观。","Changes appearance in this browser only."),mode));
  general.append(prefSwitch("cards",t("分组卡片","Grouped cards"),t("为设置分组添加小圆角表面。","Use small cornered surfaces for groups.")));
  const palettes=[["OnePlus Classic",[["OnePlus Blue","#42A5F5"],["Golden","#CC6F4E"],["Lemon Yellow","#E6A545"],["Grass Green","#7DC22F"],["Charm Purple","#9575CD"],["Sky Blue","#26C6DA"],["Vigour Red","#F06292"],["Fashion Pink","#BA68C8"]]],["Material Colors",[["Blue","#2196F3"],["Teal","#009688"],["Green","#4CAF50"],["Red","#F44336"],["Orange","#FF9800"],["Purple","#9C27B0"],["Cyan","#00BCD4"],["Indigo","#3F51B5"],["Pink","#E91E63"],["Blue Grey","#607D8B"],["Deep Orange","#FF5722"],["Light Green","#8BC34A"]]]];
  function updateSwatches(){host.querySelectorAll(".ml-swatch-item").forEach(b=>{const active=b.dataset.seed===appearance.prefs.seed;b.setAttribute("aria-pressed",String(active));const s=b.querySelector(".ml-swatch");s.textContent=active?"✓":"";s.style.color=MaterialPalette.generate(b.dataset.seed,false).swatchForeground;});}
  for(const [title,colors] of palettes){const g=group(title),grid=node("div",{class:"ml-swatches"});for(const [label,color] of colors){const b=textButton(label,()=>{appearance.set("seed",color);hex.value=color;error.textContent="";hex.setAttribute("aria-invalid","false");updateSwatches();},"ml-swatch-item");b.dataset.seed=color;const sw=node("span",{class:"ml-swatch","aria-hidden":"true"});sw.style.background=color;b.prepend(sw);grid.append(b);}g.append(grid);}
  const custom=group(t("自定义强调色","Custom accent")),label=node("label",{for:"ml-hex",text:"HEX"}),hex=node("input",{id:"ml-hex",type:"text",maxlength:7,autocomplete:"off",spellcheck:"false","aria-describedby":"ml-hex-error"}),error=node("div",{id:"ml-hex-error",class:"ml-field-error",role:"status"});
  hex.value=appearance.prefs.seed;hex.addEventListener("input",()=>{const pos=hex.selectionStart;hex.value="#"+hex.value.replace(/[^0-9a-f]/gi,"").slice(0,6).toUpperCase();hex.setSelectionRange(Math.min(pos,hex.value.length),Math.min(pos,hex.value.length));const valid=/^#[0-9A-F]{6}$/.test(hex.value);hex.setAttribute("aria-invalid",String(!valid));error.textContent=valid?"":t("请输入 6 位 HEX 颜色值","Enter a 6 digit HEX color");if(valid){appearance.set("seed",hex.value);updateSwatches();}});
  custom.append(label,hex,error);
  const ranges=group(t("额外着色范围","Additional accent areas"));
  ranges.append(prefSwitch("toolbar",t("顶栏背景","Toolbar background"),t("使用派生主表面和对应文字色。","Use the derived primary surface.")),prefSwitch("categories",t("分组标题","Section headings"),t("使用可读的强调色文字。","Use contrast adjusted accent text.")),prefSwitch("icons",t("导航与返回图标","Navigation and back icons"),t("为中性顶栏图标着色。","Accent icons in the neutral toolbar.")));
  const about=group(t("关于","About"));about.append(node("p",{class:"hint",text:"MaterialLuCI 0.1.0 · Classic Native"}),node("p",{class:"hint",text:t("外观偏好保存在此浏览器，不更改路由器配置。","Preferences are stored in this browser without changing router configuration.")}));
  updateSwatches();MaterialFeedback.bind(host);mode.focus({preventScroll:true});
 }
 function menuBody(entries){const body=node("div",{class:"ml-menu"});for(const entry of entries){if(entry.children&&entry.children.length){const details=node("details",{},[node("summary",{text:entry.title}),menuBody(entry.children)]);if(entry.active||entries.length===1)details.open=true;body.append(details);}else if(entry.url){const link=node("a",{href:entry.url},[node("span",{text:entry.title})]);if(entry.active)link.setAttribute("aria-current","page");body.append(link);}}return body;}
 function openMenu(group){
  if(appearancePage){if(history.state&&history.state.materialluci==="appearance")history.back();return;}
  const title={status:t("状态","Status"),network:t("网络","Network"),settings:t("设置","Settings")}[group],entries=menus?menus[group]:null;
  const body=entries?menuBody(entries):node("div",{},[node("p",{text:menuError||t("正在读取菜单…","Loading menu…")}),node("div",{class:"ml-loading-line"})]);
  if(group==="settings"){const b=textButton(t("界面外观","Appearance"),()=>{closeDialog();setTimeout(openAppearance,180);},"ml-option");body.prepend(b);}
  openDialog(title,body);
 }
 const selectAdapters=new WeakMap();
 function adaptSelect(select){
  if(selectAdapters.has(select)||select.multiple||select.size>1||select.closest(".cbi-dropdown")||select.options.length>60)return;
  const title=select.closest(".cbi-value")?.querySelector(".cbi-value-title")?.textContent.trim()||t("选择","Select");
  const choice=textButton("",()=>{
   if(select.disabled)return;
   const options=[...select.options].filter(o=>!o.disabled).map(o=>[o.value,o.textContent]);
   choose(title,options,select.value,value=>{
    select.value=value;
    select.dispatchEvent(new Event("input",{bubbles:true}));
    select.dispatchEvent(new Event("change",{bubbles:true}));
    select.dispatchEvent(new Event("blur"));
    update();
   });
  },"ml-choice ml-select-choice");
  choice.setAttribute("aria-label",title);choice.setAttribute("aria-haspopup","dialog");
  const originalHidden=select.hidden;select.hidden=true;select.after(choice);
  function update(){choice.firstChild.textContent=select.selectedOptions[0]?.textContent||t("未设置","Not set");choice.disabled=select.disabled;choice.setAttribute("aria-invalid",String(select.classList.contains("cbi-input-invalid")||select.getAttribute("aria-invalid")==="true"));}
  select.addEventListener("change",update);
  const obs=new MutationObserver(update);obs.observe(select,{attributes:true,childList:true,subtree:true});
  // Preserve LuCI UISelect.setValue(), which sets individual option.selected properties.
  for(const option of select.options){
   const d=Object.getOwnPropertyDescriptor(HTMLOptionElement.prototype,"selected");
   if(d&&d.configurable)Object.defineProperty(option,"selected",{configurable:true,get(){return d.get.call(this);},set(v){d.set.call(this,v);queueMicrotask(update);}});
  }
  selectAdapters.set(select,{update,originalHidden,observer:obs});update();
 }
 function enhance(root){
  const all=selector=>[...(root.matches&&root.matches(selector)?[root]:[]),...root.querySelectorAll(selector)];
  for(const input of all('.cbi-checkbox>input[type="checkbox"],input.cbi-input-checkbox')){
   if(input.classList.contains("ml-switch")||input.closest(".cbi-dropdown,[role=group]")||input.closest("label"))continue;
   input.classList.add("ml-switch");input.setAttribute("role","switch");
   const hit=node("label",{class:"ml-switch-hit"});input.parentNode.insertBefore(hit,input);hit.append(input);
  }
  for(const input of all('.cbi-page-actions>input[type="submit"],.cbi-page-actions>input[type="button"],.cbi-page-actions>input[type="reset"]')){
   if(input.closest(".ml-native-button"))continue;const wrapper=node("span",{class:"ml-native-button"});input.parentNode.insertBefore(wrapper,input);wrapper.append(input);
  }
  for(const table of all("table.cbi-section-table,.table.cbi-section-table")){
   if(table.parentElement.classList.contains("ml-table-scroll"))continue;const wrapper=node("div",{class:"ml-table-scroll"});table.parentNode.insertBefore(wrapper,table);wrapper.append(table);
  }
  for(const select of all(".cbi-value-field select"))adaptSelect(select);
  MaterialFeedback.bind(root);
 }
 window.addEventListener("popstate",()=>{
  if(dialog&&(!history.state||history.state.materialluci!=="dialog"||history.state.id!==dialog.id))finishDialog();
  if(appearancePage&&(!history.state||!["appearance","dialog"].includes(history.state.materialluci)))closeAppearance();
  // A forward entry must not recreate an already handled dialog or action.
 });
 if(back)back.addEventListener("click",nativeBack);
 document.getElementById("ml-appearance-button")?.addEventListener("click",openAppearance);
 document.getElementById("ml-menu-button")?.addEventListener("click",()=>openMenu(document.body.dataset.mlGroup||"settings"));
 document.querySelectorAll(".ml-bottom-tab").forEach(b=>b.addEventListener("click",()=>openMenu(b.dataset.group)));
 if(document.querySelector('input[name="luci_password"]'))document.body.classList.add("ml-login");
 enhance(main);
 let scheduled=false;const pending=new Set();
 function flush(){scheduled=false;for(const n of pending)if(n.isConnected)enhance(n);pending.clear();}
 const observer=new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1&&!n.classList.contains("tap-ripple"))pending.add(n);if(pending.size&&!scheduled){scheduled=true;requestAnimationFrame(flush);}});
 observer.observe(main,{childList:true,subtree:true});
 // LuCI owns its modal. Enhance new controls without replacing showModal/hideModal.
 const modalObserver=new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1&&!n.classList.contains("tap-ripple"))enhance(n);});
 function watchModal(modal){if(modal){modalObserver.observe(modal,{childList:true,subtree:true});enhance(modal);}}
 watchModal(document.getElementById("modal_overlay"));
 const bodyObserver=new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1&&n.id==="modal_overlay")watchModal(n);});
 bodyObserver.observe(document.body,{childList:true});
 const vv=window.visualViewport;function viewport(){if(vv)document.body.style.height=vv.height+"px";}if(vv){vv.addEventListener("resize",viewport);viewport();}
 window.MaterialLuCI={setMenus(value,group){menus=value;document.body.dataset.mlGroup=group;document.querySelectorAll(".ml-bottom-tab").forEach(b=>{if(b.dataset.group===group)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});},menuFailed(err){menuError=t("菜单加载失败，请刷新页面。","Menu could not load. Reload the page.");console.error(err);},openMenu,openAppearance,choose,enhance};
 document.documentElement.dataset.loading="false";
})();
