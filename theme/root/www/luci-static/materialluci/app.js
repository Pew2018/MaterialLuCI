"use strict";
/* Presentation only. LuCI owns menu ACLs, fields, values, RPC and modal actions. */
(function(){
 const appearance=window.MaterialAppearance,main=document.getElementById("maincontent"),
 sidebar=document.getElementById("ml-sidebar"),toolbar=document.querySelector(".ml-toolbar"),
 menuButton=document.getElementById("ml-menu-button"),scrim=document.getElementById("ml-drawer-scrim");
 if(!main||!appearance)return;
 const zh=document.documentElement.lang.startsWith("zh"),t=(cn,en)=>zh?cn:en;
 const node=(tag,attrs={},children=[])=>{const el=document.createElement(tag);for(const [key,val] of Object.entries(attrs)){if(key==="text")el.textContent=val;else if(key==="class")el.className=val;else el.setAttribute(key,String(val));}for(const child of children)el.append(child);return el;};
 const textButton=(text,fn,cls="text-action")=>{const b=node("button",{type:"button",class:cls},[node("span",{text})]);b.addEventListener("click",fn);return b;};
 const narrow=matchMedia("(max-width: 1023px)");
 let dialog=null,sequence=0,drawerFocus=null,drawerInert=[];
 const focusables=el=>[...el.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]')].filter(n=>n.getClientRects().length&&!n.closest("[inert]"));
 function trap(e,panel){if(e.key!=="Tab")return;const fs=focusables(panel);if(!fs.length)return;const first=fs[0],last=fs[fs.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
 function setDrawer(open,restore=true){
  open=!!open&&narrow.matches&&!document.body.classList.contains("ml-login");
  const was=document.body.classList.contains("ml-drawer-open");
  if(open===was){sidebar.inert=narrow.matches&&!open;return;}
  document.body.classList.toggle("ml-drawer-open",open);scrim.hidden=!open;
  menuButton.setAttribute("aria-expanded",String(open));sidebar.inert=narrow.matches&&!open;
  if(open){drawerFocus=document.activeElement;drawerInert=[main,toolbar].map(el=>[el,el.inert]);drawerInert.forEach(([el])=>el.inert=true);sidebar.setAttribute("role","dialog");sidebar.setAttribute("aria-modal","true");(sidebar.querySelector('[aria-current="page"]')||focusables(sidebar)[0])?.focus({preventScroll:true});}
  else{drawerInert.forEach(([el,value])=>el.inert=value);drawerInert=[];sidebar.removeAttribute("role");sidebar.removeAttribute("aria-modal");if(restore&&drawerFocus?.isConnected)drawerFocus.focus({preventScroll:true});}
 }
 function renderMenus(entries){
  if(!Array.isArray(entries))throw new TypeError("Incompatible menu adapter. Reload the updated theme resources.");
  const host=document.getElementById("ml-menu-tree");host.replaceChildren();
  for(const [i,entry] of entries.entries()){
   const children=Array.isArray(entry.children)?entry.children:[],
    expanded=!!entry.active||children.some(child=>child.active),
    group=node("section",{class:"ml-nav-group"});
   if(expanded)group.dataset.active="true";
   if(children.length){
    const list=node("div",{id:"ml-nav-children-"+i,class:"ml-nav-children"});list.hidden=!expanded;
    const toggle=node("button",{type:"button",class:"ml-nav-parent","aria-controls":list.id,"aria-expanded":String(expanded),"aria-label":t("展开或收起："+entry.title,"Expand or collapse: "+entry.title)},[
     node("span",{class:"ml-nav-parent-label",text:entry.title}),
     node("span",{class:"ml-nav-chevron","aria-hidden":"true",text:"⌄"})
    ]);
    toggle.addEventListener("click",()=>{
     const open=list.hidden;
     list.hidden=!open;toggle.setAttribute("aria-expanded",String(open));group.dataset.active=String(open);
    });
    const header=node("div",{class:"ml-nav-row"},[toggle]);group.append(header);
    if(entry.url&&!children.some(child=>child.url===entry.url)){
     const direct=node("a",{href:entry.url,class:"ml-nav-entry-link",text:entry.title});
     if(entry.active)direct.setAttribute("aria-current","page");
     list.append(direct);
    }
    for(const child of children){
     const a=node("a",{href:child.url,text:child.title});
     if(child.active)a.setAttribute("aria-current","page");
     list.append(a);
    }
    group.append(list);
   }else{
    const link=node("a",{href:entry.url,class:"ml-nav-parent ml-nav-leaf",text:entry.title});
    if(entry.active)link.setAttribute("aria-current","page");
    group.append(node("div",{class:"ml-nav-row"},[link]));
   }
   host.append(group);
  }
  host.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>setDrawer(false,false)));
  MaterialFeedback.bind(sidebar);document.body.dataset.mlMenus="ready";
 }
 menuButton?.addEventListener("click",()=>setDrawer(!document.body.classList.contains("ml-drawer-open")));
 document.getElementById("ml-drawer-close")?.addEventListener("click",()=>setDrawer(false));
 scrim?.addEventListener("click",()=>setDrawer(false));
 sidebar?.addEventListener("keydown",e=>{if(narrow.matches&&document.body.classList.contains("ml-drawer-open")){if(e.key==="Escape"){e.preventDefault();setDrawer(false);}trap(e,sidebar);}});
 function drawerResize(){setDrawer(false);sidebar.inert=narrow.matches;}
 if(narrow.addEventListener)narrow.addEventListener("change",drawerResize);else narrow.addListener(drawerResize);
 drawerResize();
 function finishDialog(){
  if(!dialog)return;const old=dialog;dialog=null;old.backdrop.remove();document.body.classList.remove("ml-dialog-open");
  old.inert.forEach(([el,value])=>el.inert=value);if(old.focus?.isConnected)old.focus.focus({preventScroll:true});
 }
 function closeDialog(){if(!dialog)return;if(history.state?.materialluci==="dialog"&&history.state.id===dialog.id)history.back();else finishDialog();}
 function openDialog(title,body){
  if(dialog)return;setDrawer(false,false);
  const id=++sequence,heading=node("h2",{id:"ml-dialog-title-"+id,text:title}),
  panel=node("div",{class:"ml-dialog",role:"dialog","aria-modal":"true","aria-labelledby":heading.id},[heading,node("div",{class:"ml-dialog-body"},[body])]);
  const cancel=textButton(t("取消","Cancel"),closeDialog);panel.append(node("div",{class:"ml-dialog-actions"},[cancel]));
  const bg=node("div",{class:"ml-backdrop"},[panel]);
  dialog={id,backdrop:bg,focus:document.activeElement,inert:[main,sidebar,toolbar].map(el=>[el,el.inert])};
  dialog.inert.forEach(([el])=>el.inert=true);document.body.classList.add("ml-dialog-open");document.body.append(bg);
  history.pushState({materialluci:"dialog",id},"",location.href);
  bg.addEventListener("click",e=>{if(e.target===bg)closeDialog();});
  bg.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();closeDialog();}trap(e,panel);});
  MaterialFeedback.bind(bg);viewport();(focusables(panel)[0]||cancel).focus({preventScroll:true});
 }
 function choose(title,options,value,onChange){
  const body=node("div",{role:"radiogroup","aria-label":title});
  for(const [key,label] of options){
   const b=node("button",{type:"button",class:"ml-option",role:"radio","aria-checked":key===value},[node("span",{text:label}),node("span",{class:"ml-radio","aria-hidden":"true"})]);
   b.addEventListener("click",()=>{if(!dialog)return;body.querySelectorAll("[aria-checked]").forEach(e=>e.setAttribute("aria-checked",String(e===b)));onChange(key);closeDialog();});body.append(b);
  }
  openDialog(title,body);
 }
 function row(title,description,control){return node("div",{class:"ml-setting-row"},[node("span",{class:"ml-row-copy"},[node("strong",{text:title}),node("small",{text:description})]),control]);}
 function prefSwitch(key,title,description){
  const input=node("input",{type:"checkbox",class:"ml-switch",role:"switch","aria-label":title});input.checked=appearance.prefs[key];input.addEventListener("change",()=>appearance.set(key,input.checked));
  return row(title,description,node("label",{class:"ml-switch-hit"},[input]));
 }
 function openAppearance(container){
  if(document.getElementById("ml-appearance"))return;
  const host=node("section",{id:"ml-appearance"});container.append(host);
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
  const about=group(t("关于","About"));about.append(node("p",{class:"hint",text:"MaterialLuCI @VERSION@ · Classic Native"}),node("p",{class:"hint",text:t("外观偏好保存在此浏览器，不更改路由器配置。","Preferences are stored in this browser without changing router configuration.")}));
  updateSwatches();MaterialFeedback.bind(host);
 }
 function appearanceEntry(root){
  if(document.getElementById("ml-appearance-entry"))return;
  const selects=[...(root.matches?.("select")?[root]:[]),...root.querySelectorAll("select")];
  const select=selects.find(s=>/(^|\.)mediaurlbase$/.test(s.name)||[...s.options].some(o=>o.value.startsWith("/luci-static/")));
  const field=select?.closest(".cbi-value");
  if(!field)return;
  const details=node("details",{id:"ml-appearance-entry",class:"ml-appearance-entry"},[node("summary",{text:t("主题外观（此浏览器）","Theme appearance (this browser)")})]);
  field.after(details);details.addEventListener("toggle",()=>{if(details.open)openAppearance(details);});
 }
 function enhance(root){
  const all=selector=>[...(root.matches&&root.matches(selector)?[root]:[]),...root.querySelectorAll(selector)];
  // Older opkg views use div.btn. Preserve their click handlers and make
  // keyboard behavior and disabled semantics match real buttons.
  for(const button of all('div.btn')){
   if(button.dataset.mlButton)continue;button.dataset.mlButton="true";
   button.setAttribute("role","button");button.tabIndex=button.hasAttribute("disabled")?-1:0;
   if(button.hasAttribute("disabled"))button.setAttribute("aria-disabled","true");
   button.addEventListener("keydown",event=>{if((event.key==="Enter"||event.key===" ")&&!button.hasAttribute("disabled")&&button.getAttribute("aria-disabled")!=="true"){event.preventDefault();button.click();}});
  }
  // Only explicit boolean LuCI fields get switches; list/group checkboxes remain checkboxes.
  for(const input of all('.cbi-checkbox>input[type="checkbox"],input.cbi-input-checkbox')){
   if(input.classList.contains("ml-switch")||input.closest(".cbi-dropdown,[role=group],.cbi-section-table,.ml-table-scroll")||input.closest("label"))continue;
   const field=input.closest(".cbi-value-field");
   if(!field||field.querySelectorAll('input[type="checkbox"]').length!==1)continue;
   input.classList.add("ml-switch");input.setAttribute("role","switch");
   if(!input.getAttribute("aria-label")){const title=input.closest(".cbi-value")?.querySelector(".cbi-value-title")?.textContent.trim();if(title)input.setAttribute("aria-label",title);}
   const hit=node("label",{class:"ml-switch-hit"});input.parentNode.insertBefore(hit,input);hit.append(input);
  }
  for(const input of all('.cbi-page-actions>input[type="submit"],.cbi-page-actions>input[type="button"],.cbi-page-actions>input[type="reset"]')){
   if(input.closest(".ml-native-button"))continue;const wrapper=node("span",{class:"ml-native-button"});input.parentNode.insertBefore(wrapper,input);wrapper.append(input);
  }
  // Includes live status div-tables as well as legacy Lua CBI tables.
  const tables=new Set(all("table,.table"));const ancestor=root.closest?.("table,.table");if(ancestor)tables.add(ancestor);
  for(const table of tables){
   if(table.closest(".ml-table-scroll")||table.parentElement.closest("table,.table"))continue;
   const first=table.querySelector("tr,.tr"),cells=first?[...first.children].filter(c=>c.matches("td,th,.td,.th")).length:0;
   if(cells<3&&!table.classList.contains("cbi-section-table"))continue;
   const wrapper=node("div",{class:"ml-table-scroll",tabindex:0,role:"region","aria-label":t("表格，可横向滚动","Table, horizontally scrollable")});
   if(cells>=5)table.classList.add("ml-wide-table");
   table.parentNode.insertBefore(wrapper,table);wrapper.append(table);
  }
  // Preserve zone/status background semantics, with readable foreground in either mode.
  for(const head of all('.ifacebox-head[style*="background"]')){
   const rgb=getComputedStyle(head).backgroundColor.match(/[0-9.]+/g)?.map(Number);
   if(rgb&&rgb.length>=3&&(rgb.length<4||rgb[3]>0)){
    const linear=rgb.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
    const luminance=linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;
    const foreground=luminance>.179?"#000000":"#FFFFFF";if(head.style.color!==foreground)head.style.color=foreground;
   }
  }
  // Keep original selects and LuCI dropdowns authoritative, including keyboard behavior.
  appearanceEntry(root);MaterialFeedback.bind(root);
 }
 window.addEventListener("popstate",()=>{if(dialog&&(!history.state||history.state.materialluci!=="dialog"||history.state.id!==dialog.id))finishDialog();setDrawer(false);});
 if(document.querySelector('input[name="luci_password"]'))document.body.classList.add("ml-login");
 enhance(main);
 let scheduled=false;const pending=new Set();
 function flush(){scheduled=false;for(const n of pending)if(n.isConnected)enhance(n);pending.clear();}
 const observer=new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1&&!n.classList.contains("tap-ripple"))pending.add(n);if(pending.size&&!scheduled){scheduled=true;requestAnimationFrame(flush);}});
 observer.observe(main,{childList:true,subtree:true});
 const watched=new WeakSet();
 function watchModal(modal){if(!modal||watched.has(modal))return;watched.add(modal);enhance(modal);new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1&&!n.classList.contains("tap-ripple"))enhance(n);}).observe(modal,{childList:true,subtree:true});}
 watchModal(document.getElementById("modal_overlay"));
 new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1&&n.id==="modal_overlay")watchModal(n);}).observe(document.body,{childList:true});
 const vv=window.visualViewport,root=document.documentElement;let viewportFrame=0;
 function viewport(){
  viewportFrame=0;
  // Restrict viewport geometry to overlays. Do not resize the document or disable zoom.
  const h=vv?.height||innerHeight,w=vv?.width||innerWidth,top=vv?.offsetTop||0,left=vv?.offsetLeft||0;
  root.style.setProperty("--ml-vv-height",h+"px");root.style.setProperty("--ml-vv-width",w+"px");
  root.style.setProperty("--ml-vv-top",top+"px");root.style.setProperty("--ml-vv-left",left+"px");
  const editing=document.activeElement?.matches('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]),textarea');
  const inset=narrow.matches&&editing&&(!vv||Math.abs(vv.scale-1)<.05)?Math.max(0,innerHeight-h-top):0;
  // Add scroll room for the final form field only while an editor is focused.
  root.style.setProperty("--ml-keyboard-space",inset>100?inset+"px":"0px");

 }
 function queueViewport(){if(!viewportFrame)viewportFrame=requestAnimationFrame(viewport);}
 if(vv){vv.addEventListener("resize",queueViewport,{passive:true});vv.addEventListener("scroll",queueViewport,{passive:true});}
 window.addEventListener("resize",queueViewport,{passive:true});viewport();
 // A one-time focus correction after keyboard resize; avoid scroll-event feedback loops.
 let focusTimer;
 function revealFocused(){
  const el=document.activeElement;
  if(!el?.matches('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),textarea,select'))return;
  if(vv&&Math.abs(vv.scale-1)>.05)return;
  const rect=el.getBoundingClientRect(),top=(vv?.offsetTop||0)+12,bottom=(vv?.offsetTop||0)+(vv?.height||innerHeight)-16;
  const container=el.closest(".modal,.ml-dialog-body"),limits=container?.getBoundingClientRect();
  const title=container?.querySelector(":scope>h4,:scope>h3"),actions=container?.querySelector(":scope>.right");
  const headerBottom=title&&getComputedStyle(title).position==="sticky"?title.getBoundingClientRect().bottom+8:0;
  const actionTop=actions&&getComputedStyle(actions).position==="sticky"?actions.getBoundingClientRect().top-8:bottom;
  const high=Math.max(top,limits?.top||top,headerBottom,container?0:toolbar.getBoundingClientRect().bottom+12),low=Math.min(bottom,limits?.bottom||bottom,actionTop);
  const delta=rect.top<high?rect.top-high:rect.bottom>low?Math.min(rect.bottom-low,rect.top-high):0;
  if(delta){if(container)container.scrollBy({top:delta,behavior:"auto"});else window.scrollBy({top:delta,behavior:"auto"});}

 }
 document.addEventListener("focusin",()=>{queueViewport();clearTimeout(focusTimer);focusTimer=setTimeout(revealFocused,280);});
 document.addEventListener("focusout",queueViewport);
 if(vv)vv.addEventListener("resize",()=>{clearTimeout(focusTimer);focusTimer=setTimeout(revealFocused,180);},{passive:true});
 window.MaterialLuCI={setMenus:renderMenus,menuFailed(err){const host=document.getElementById("ml-menu-tree");host.replaceChildren(node("p",{class:"hint",text:t("菜单加载失败，请刷新页面。","Menu could not load. Reload the page.")}));console.error(err);},choose,enhance};
 document.documentElement.dataset.loading="false";
})();
