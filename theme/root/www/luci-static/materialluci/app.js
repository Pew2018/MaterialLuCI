"use strict";
/* Presentation only. LuCI owns menu ACLs, fields, values, RPC and modal actions. */
(function(){
 const appearance=window.MaterialAppearance,main=document.getElementById("maincontent"),
 sidebar=document.getElementById("ml-sidebar"),toolbar=document.querySelector(".ml-toolbar"),
 menuButton=document.getElementById("ml-menu-button"),scrim=document.getElementById("ml-drawer-scrim");
 if(!main||!appearance)return;
 function identifyPage(){
  const parts=route=>Array.isArray(route)?route.filter(Boolean):typeof route==="string"?route.split(/[\\/-]+/).filter(Boolean):[];
  const routes=[document.body.dataset.page,window.L?.env?.dispatchpath,window.L?.env?.requestpath,location.pathname];
  const segments=routes.map(parts).find(route=>route.length&&route[route.length-1]!=="luci")||[];
  const page=segments[segments.length-1]||"";if(main.dataset.mlPage!==page)main.dataset.mlPage=page;
 }
 identifyPage();
 const zh=document.documentElement.lang.startsWith("zh"),t=(cn,en)=>zh?cn:en;
 const node=(tag,attrs={},children=[])=>{const el=document.createElement(tag);for(const [key,val] of Object.entries(attrs)){if(key==="text")el.textContent=val;else if(key==="class")el.className=val;else el.setAttribute(key,String(val));}for(const child of children)el.append(child);return el;};
 const textButton=(text,fn,cls="text-action")=>{if(cls==="text-action"&&MaterialComponents.isM3())return MaterialComponents.button(text,fn,cls,"text");const b=node("button",{type:"button",class:cls},[node("span",{text})]);b.addEventListener("click",fn);return b;};
 const switches=new Map(),disclosures=new Map();
 function switchControl(input,label){
  {const entry=MaterialComponents.switchControl(input,label);if(entry){const cleanup=entry.destroy;entry.destroy=()=>{cleanup();switches.delete(input);};switches.set(input,entry);return entry.control;}}
  const control=node("button",{type:"button",class:"mdc-switch "+(input.checked?"mdc-switch--selected":"mdc-switch--unselected"),role:"switch","aria-label":label,"aria-checked":String(!!input.checked)},[
   node("span",{class:"mdc-switch__track"}),
   node("span",{class:"mdc-switch__handle-track"},[node("span",{class:"mdc-switch__handle"},[
    node("span",{class:"mdc-switch__shadow"},[node("span",{class:"mdc-elevation-overlay"})]),
    node("span",{class:"mdc-switch__ripple"}),
    node("span",{class:"mdc-switch__icons","aria-hidden":"true"})
   ])]),
   node("span",{class:"mdc-switch__focus-ring-wrapper","aria-hidden":"true"},[node("span",{class:"mdc-switch__focus-ring"})])
  ]);
  control.querySelector(".mdc-switch__icons").innerHTML='<svg class="mdc-switch__icon mdc-switch__icon--on" viewBox="0 0 24 24"><path d="M19.69 5.23 8.96 15.96 4.73 11.73 2.96 13.5 8.96 19.5 21.46 7z"/></svg><svg class="mdc-switch__icon mdc-switch__icon--off" viewBox="0 0 24 24"><path d="M20 13H4v-2h16z"/></svg>';
  let instance;
  try{instance=new MaterialMDCSwitch.MDCSwitch(control);control._mlMdcSwitch=instance;}
  catch(error){console.error("MaterialLuCI: MDCSwitch initialization failed",error);control.hidden=true;return control;}
  const original={tabindex:input.getAttribute("tabindex"),hidden:input.getAttribute("aria-hidden")};
  // Checkbox is the sole saved-field authority. Only MDC writes its classes/ARIA.
  const sync=()=>{const checked=!!input.checked,disabled=input.matches(":disabled");if(instance.selected!==checked)instance.selected=checked;if(instance.disabled!==disabled)instance.disabled=disabled;};
  input.classList.add("ml-switch-source");input.tabIndex=-1;input.setAttribute("aria-hidden","true");
  input.addEventListener("change",sync);input.addEventListener("input",sync);
  const descriptors={};
  for(const key of ["checked","disabled"]){
   if(Object.getOwnPropertyDescriptor(input,key))continue;
   const descriptor=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,key);
   Object.defineProperty(input,key,{configurable:true,get(){return descriptor.get.call(this);},set(value){descriptor.set.call(this,value);sync();}});
   descriptors[key]=true;
  }
  const attrs=MaterialComponents.watchState(input,sync);
  // MDC's click listener is registered first. Native click preserves LuCI's
  // click/update/change/dependency events exactly once, including cancellation.
  control.addEventListener("click",event=>{
   event.preventDefault();event.stopPropagation();
   if(input.disabled){sync();return;}
   input.click();sync();
  });
  const reset=()=>setTimeout(sync,0);
  document.addEventListener("reset",reset,true);
  switches.set(input,{control,destroy(){
   attrs.disconnect();instance.destroy();control._mlMdcSwitch=null;document.removeEventListener("reset",reset,true);
   input.removeEventListener("change",sync);input.removeEventListener("input",sync);
   for(const key of Object.keys(descriptors))delete input[key];
   input.classList.remove("ml-switch","ml-switch-source");
   for(const [key,value] of [["tabindex",original.tabindex],["aria-hidden",original.hidden]])if(value===null)input.removeAttribute(key);else input.setAttribute(key,value);
   control.remove();switches.delete(input);
  }});
  sync();return control;
 }
 
 window.addEventListener("pagehide",event=>{if(!event.persisted){for(const entry of [...switches.values()])entry.destroy();for(const entry of [...disclosures.values()])entry.destroy();}});

 // Keep LuCI's span and first text node: ui.showIndicator updates them in place.
 // Only poll-status is an automatic-refresh action; other indicators keep their semantics.
 const indicators=document.getElementById("indicators"),pollBound=new WeakSet(),pollFallback=new WeakSet();
 function syncPollIndicator(){
  const el=indicators?.querySelector('[data-indicator="poll-status"]');
  if(!el)return;
  const paused=el.getAttribute("data-style")==="inactive";
  if(!el.classList.contains("ml-poll-action"))el.classList.add("ml-poll-action");MaterialRuntime.setAttr(el,"role","button");MaterialRuntime.setAttr(el,"tabindex",0);
  MaterialRuntime.setAttr(el,"aria-label",paused?t("恢复自动刷新","Resume automatic refresh"):t("暂停自动刷新","Pause automatic refresh"));
  const label=paused?t("已暂停自动刷新","Automatic refresh paused"):t("正在自动刷新","Automatic refresh running");
  if(window.MaterialExtras)MaterialExtras.setTooltip(el,label);else MaterialRuntime.setAttr(el,"title",label);
  MaterialRuntime.setAttr(el,"data-paused",paused);
  if(!pollBound.has(el)){pollBound.add(el);el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();if(!e.repeat)el.click();}});MaterialFeedback.bind(el);}
  // LuCI creates an inactive indicator without a click handler. It does not
  // retrofit one when polling resumes, so provide the same Poll start/stop
  // operation only when the native clickable attribute is absent.
  if(!el.hasAttribute("data-clickable")&&!pollFallback.has(el)){
   pollFallback.add(el);el.setAttribute("data-clickable","true");
   el.addEventListener("click",()=>{const resume=el.getAttribute("data-style")==="inactive";el.setAttribute("data-style",resume?"active":"inactive");try{Promise.resolve(L.require("poll")).then(poll=>resume?poll.start():poll.stop()).catch(error=>{el.setAttribute("data-style",resume?"inactive":"active");console.error("Unable to toggle LuCI polling",error);});}catch(error){el.setAttribute("data-style",resume?"inactive":"active");console.error("Unable to toggle LuCI polling",error);}});
  }
 }
 if(indicators)new MutationObserver(syncPollIndicator).observe(indicators,{childList:true,subtree:true,attributes:true,attributeFilter:["data-style","data-clickable"]});
 syncPollIndicator();

 const narrow=matchMedia("(max-width: 1023px)");
 let dialog=null,sequence=0,drawerFocus=null,drawerInert=[];
 const focusables=el=>[...el.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),summary,md-switch:not([disabled]),md-outlined-button:not([disabled]),md-text-button:not([disabled]),md-checkbox:not([disabled]),md-radio:not([disabled]),[tabindex="0"]')].filter(n=>n.getClientRects().length&&!n.closest("[inert]"));
 function trap(e,panel){if(e.key!=="Tab")return;const fs=focusables(panel);if(!fs.length)return;const first=fs[0],last=fs[fs.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
 function setDrawer(open,restore=true){
  open=!!open&&narrow.matches&&!document.body.classList.contains("ml-login");
  const was=document.body.classList.contains("ml-drawer-open");
  if(open===was){sidebar.inert=narrow.matches&&!open;return;}
  document.body.classList.toggle("ml-drawer-open",open);scrim.hidden=!open;
  menuButton.setAttribute("aria-expanded",String(open));sidebar.inert=narrow.matches&&!open;
  if(open){drawerFocus=document.activeElement;drawerInert=[main,toolbar].map(el=>[el,el.inert]);drawerInert.forEach(([el])=>el.inert=true);sidebar.setAttribute("role","dialog");sidebar.setAttribute("aria-modal","true");(sidebar.querySelector('[aria-current="page"]')||focusables(sidebar)[0])?.focus({preventScroll:true});}
  else{drawerInert.forEach(([el,value])=>el.inert=value);drawerInert=[];sidebar.removeAttribute("role");sidebar.removeAttribute("aria-modal");if(restore&&drawerFocus?.isConnected)drawerFocus.focus({preventScroll:true});}
  queueViewport();
 }
 function renderMenus(entries){
  if(!Array.isArray(entries))throw new TypeError("Incompatible menu adapter. Reload the updated theme resources.");
  const host=document.getElementById("ml-menu-tree");host.replaceChildren();
  const activeIndex=entries.findIndex(entry=>entry.active||entry.children?.some(child=>child.active));
  for(const [i,entry] of entries.entries()){
   const children=Array.isArray(entry.children)?entry.children:[],
    expanded=i===activeIndex,
    group=node("section",{class:"ml-nav-group"});
   if(expanded)group.dataset.active="true";
   if(children.length){
    const list=node("div",{id:"ml-nav-children-"+i,class:"ml-nav-children"});list.hidden=!expanded;
    const toggle=node("button",{type:"button",class:"ml-nav-parent mdc-button","aria-controls":list.id,"aria-expanded":String(expanded),"aria-label":t("展开或收起："+entry.title,"Expand or collapse: "+entry.title)},[
     node("span",{class:"ml-nav-parent-label mdc-button__label",text:entry.title}),
     node("span",{class:"ml-nav-chevron mdc-button__icon","aria-hidden":"true"})
    ]);
    // A dragged/cancelled touch cannot expand a section via a compatibility click.
    let gesture=null,cancelled=false;
    toggle.addEventListener("pointerdown",e=>{gesture={x:e.clientX,y:e.clientY};cancelled=false;},{passive:true});
    toggle.addEventListener("pointermove",e=>{if(gesture&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>10)cancelled=true;},{passive:true});
    toggle.addEventListener("pointercancel",()=>{cancelled=true;gesture=null;},{passive:true});
    toggle.addEventListener("click",event=>{
     if(event.detail&&cancelled){event.preventDefault();return;}gesture=null;
     const open=list.hidden;
     for(const other of host.querySelectorAll("button[aria-controls]")){
      const selected=other===toggle&&open;
      document.getElementById(other.getAttribute("aria-controls")).hidden=!selected;
      MaterialRuntime.setAttr(other,"aria-expanded",selected);
      const group=other.closest(".ml-nav-group");if(group.dataset.active!==String(selected))group.dataset.active=String(selected);
     }
    });
    const header=node("div",{class:"ml-nav-row ml-nav-row-action"},[toggle]);group.append(header);
    // Parent routes are not duplicated as synthetic overview entries.
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
  if(!dialog)return;const old=dialog;dialog=null;MaterialControls.closeDialog(old.backdrop);old.backdrop.remove();document.body.classList.remove("ml-dialog-open");
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
  bg.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();closeDialog();}});
  MaterialControls.dialog(bg,panel);
  MaterialFeedback.bind(bg);viewport();(focusables(panel)[0]||cancel).focus({preventScroll:true});
 }
 function choose(title,options,value,onChange){
  const body=node("div",{role:"radiogroup","aria-label":title});
  for(const [key,label] of options){
   const b=node("button",{type:"button",class:"ml-option",role:"radio","aria-checked":key===value},[node("span",{text:label}),node("span",{class:"ml-radio","aria-hidden":"true"},[node("input",{type:"radio",name:"ml-choice-"+sequence,tabindex:-1,"aria-hidden":"true",...(key===value?{checked:""}:{})})])]);
   b.addEventListener("click",()=>{if(!dialog)return;body.querySelectorAll("[aria-checked]").forEach(e=>e.setAttribute("aria-checked",String(e===b)));body.querySelectorAll('input[type="radio"]').forEach(input=>{input.checked=input.closest(".ml-option")===b;});onChange(key);closeDialog();});body.append(b);
  }
  openDialog(title,body);
 }
 function row(title,description,control){return node("div",{class:"ml-setting-row"},[node("span",{class:"ml-row-copy"},[node("strong",{text:title}),node("small",{text:description})]),control]);}
 function prefSwitch(key,title,description){
  const input=node("input",{type:"checkbox",class:"ml-switch","data-ml-owner":"appearance","aria-label":title});input.checked=appearance.prefs[key];input.addEventListener("change",()=>appearance.set(key,input.checked));
  return row(title,description,node("span",{class:"ml-switch-hit"},[input,switchControl(input,title)]));
 }
 function openAppearance(container){
  if(document.getElementById("ml-appearance"))return;
  const host=node("section",{id:"ml-appearance"});container.append(host);
  const group=title=>{const g=node("section",{class:"ml-group"},[node("h2",{text:title})]);host.append(g);return g;};
  const general=group(t("界面","Appearance"));general.dataset.group="general";
  const design=node("div",{class:"ml-mode-options ml-design-options",role:"group","aria-label":t("界面风格","Interface style")});
  const pending=node("small",{class:"ml-design-notice",role:"status"});
  const syncDesign=()=>{design.querySelectorAll("[data-design-option]").forEach(el=>el.setAttribute("aria-pressed",String(el.dataset.designOption===appearance.prefs.design)));pending.textContent=appearance.prefs.design!==appearance.activeDesign?t("已保存。下次打开页面时生效；当前未保存的设置会保留。","Saved. Applies on the next page load; unsaved settings remain on this page."):t("仅在此浏览器生效。","Applies in this browser only.");};
  for(const [key,label] of [["classic","MaterialLuCI Classic"],["m3e",t("M3E（实验）","M3E (experimental)")]]){const option=MaterialComponents.button(label,()=>{appearance.set("design",key);syncDesign();},"ml-mode-option");option.dataset.designOption=key;design.append(option);}
  general.append(row(t("界面风格","Interface style"),t("选择控件与表面的设计风格。","Choose the design of controls and surfaces."),design),pending);syncDesign();
  const modeLabels={system:t("跟随系统","System"),light:t("浅色","Light"),dark:t("深色","Dark")};
  const mode=node("div",{class:"ml-mode-options",role:"radiogroup","aria-label":t("显示模式","Display mode")});
  for(const [key,label] of Object.entries(modeLabels)){
   const option=MaterialComponents.button(label,()=>{appearance.set("mode",key);mode.querySelectorAll(".ml-mode-option").forEach(item=>{item.setAttribute("aria-checked",String(item===option));item.setAttribute("aria-pressed",String(item===option));});},"ml-mode-option");
   if(option.tagName==="BUTTON")option.setAttribute("role","radio");else mode.setAttribute("role","group");option.setAttribute("aria-checked",String(key===appearance.prefs.mode));option.setAttribute("aria-pressed",String(key===appearance.prefs.mode));mode.append(option);
  }
  general.append(row(t("显示模式","Display mode"),t("仅改变当前浏览器的界面外观。","Changes appearance in this browser only."),mode));
  general.append(prefSwitch("cards",t("分组卡片","Grouped cards"),t("使用卡片区分设置与状态分组。","Separate settings and status into cards.")));
  const identity=group(t("标题与设备名称","Title and device name"));identity.dataset.group="identity";
  identity.append(node("small",{class:"ml-design-notice",text:t("以下偏好仅保存在当前浏览器。","These preferences are stored in this browser only.")}));
  function brandRow(title,description,control){const setting=row(title,description,control);setting.classList.add("ml-brand-row");return setting;}
  function brandTextField(id,label,value,placeholder){const input=node("input",{id,type:"text",maxlength:"128",autocomplete:"off",spellcheck:"false",class:"ml-brand-input","aria-label":label});input.value=value;input.placeholder=placeholder||"";return input;}
  function bindBrandText(input,key){let composing=false;const commit=clamp=>{const value=window.MaterialBranding.normalizeText(input.value);if(clamp&&value!==input.value){const start=input.selectionStart??value.length;input.value=value;try{input.setSelectionRange(Math.min(start,value.length),Math.min(start,value.length));}catch(_){}}window.MaterialBranding.set(key,value);};input.addEventListener("compositionstart",()=>composing=true);input.addEventListener("compositionend",()=>{composing=false;queueMicrotask(()=>commit(true));});input.addEventListener("input",event=>{if(!composing&&!event.isComposing)commit(false);});input.addEventListener("blur",()=>commit(true));input.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();commit(true);input.blur();}});}
  const titleInput=brandTextField("ml-brand-toolbar-title",t("顶栏标题","Toolbar title"),window.MaterialBranding.prefs.toolbarTitle);
  bindBrandText(titleInput,"toolbarTitle");
  const resetTitle=textButton(t("恢复默认","Restore default"),()=>{window.MaterialBranding.set("toolbarTitle","");titleInput.value="";});
  identity.append(brandRow(t("顶栏标题","Toolbar title"),t("留空时显示 MaterialLuCI。","Blank uses MaterialLuCI."),node("div",{class:"ml-brand-controls"},[titleInput,resetTitle])));

  const colorMode=node("select",{id:"ml-brand-title-color-mode",class:"ml-brand-input","aria-label":t("顶栏标题颜色模式","Toolbar title color mode")},[node("option",{value:"auto",text:t("自动","Automatic")}),node("option",{value:"custom",text:t("自定义","Custom")})]);
  colorMode.value=window.MaterialBranding.prefs.toolbarTitleColor;
  identity.append(brandRow(t("顶栏标题颜色","Toolbar title color"),t("自动颜色随主题与顶栏背景更新。","Automatic color follows the theme and toolbar background."),node("div",{class:"ml-brand-controls"},[colorMode])));
  const colorText=node("input",{id:"ml-brand-title-color-text",type:"text",maxlength:"7",autocomplete:"off",spellcheck:"false",class:"ml-brand-input","aria-label":"HEX #RRGGBB","aria-describedby":"ml-brand-title-color-error"});
  const colorPicker=node("input",{id:"ml-brand-title-color-picker",type:"color","aria-label":t("选择顶栏标题颜色","Choose toolbar title color")});
  const colorError=node("div",{id:"ml-brand-title-color-error",class:"ml-field-error",role:"alert","aria-live":"polite"});
  const colorWarning=node("div",{id:"ml-brand-title-color-warning",class:"ml-brand-warning",role:"status","aria-live":"polite"});
  const colorFields=node("div",{id:"ml-brand-title-color-fields",class:"ml-brand-color-fields"},[colorText,colorPicker]);
  let customColorRow=null;
  function updateColorFeedback(){const custom=colorMode.value==="custom";colorFields.hidden=!custom;if(customColorRow)customColorRow.hidden=!custom;colorWarning.hidden=true;if(!custom)return;const contrast=window.MaterialBranding.contrastAgainstToolbar(window.MaterialBranding.prefs.toolbarTitleColorValue);if(contrast!==null&&contrast<4.5){colorWarning.hidden=false;colorWarning.textContent=t("与当前顶栏背景的对比度低于 4.5:1。仍按你的选择应用。","Contrast against the current toolbar is below 4.5:1. Your choice remains applied.");}}
  function applyBrandColor(value,source){if(!/^#[0-9a-f]{6}$/i.test(value)){colorError.textContent=t("请输入 #RRGGBB 格式的 6 位 HEX 颜色。","Enter a six-digit HEX color in #RRGGBB format.");colorText.setAttribute("aria-invalid","true");return;}const normalized=value.toUpperCase();colorError.textContent="";colorText.setAttribute("aria-invalid","false");if(source!=="text")colorText.value=normalized;if(source!=="picker")colorPicker.value=normalized;window.MaterialBranding.set("toolbarTitleColorValue",normalized);updateColorFeedback();}
  colorText.value=window.MaterialBranding.prefs.toolbarTitleColorValue;colorPicker.value=colorText.value;
  colorText.addEventListener("input",()=>applyBrandColor(colorText.value,"text"));colorText.addEventListener("blur",()=>{if(/^#[0-9a-f]{6}$/i.test(colorText.value))colorText.value=colorText.value.toUpperCase();});
  colorPicker.addEventListener("input",()=>applyBrandColor(colorPicker.value,"picker"));colorPicker.addEventListener("change",()=>applyBrandColor(colorPicker.value,"picker"));
  colorMode.addEventListener("change",()=>{window.MaterialBranding.set("toolbarTitleColor",colorMode.value);colorError.textContent="";colorText.setAttribute("aria-invalid","false");updateColorFeedback();});
  colorText.addEventListener("keydown",event=>{if(event.key==="Enter")event.preventDefault();});
  const autoColor=textButton(t("恢复自动","Restore automatic"),()=>{window.MaterialBranding.set("toolbarTitleColor","auto");colorMode.value="auto";colorError.textContent="";colorText.setAttribute("aria-invalid","false");updateColorFeedback();});
  customColorRow=brandRow(t("自定义颜色","Custom color"),t("仅调整顶栏标题文字。","Changes only the toolbar title text."),node("div",{class:"ml-brand-controls ml-brand-color-control"},[colorFields,autoColor]));identity.append(customColorRow);
  identity.append(colorError,colorWarning);updateColorFeedback();window.addEventListener("materialluci:appearance",updateColorFeedback);

  const visibility=node("input",{id:"ml-brand-sidebar-visible",type:"checkbox",class:"ml-switch","data-ml-owner":"appearance","aria-label":t("显示侧边栏设备名称","Show sidebar device name")});
  visibility.checked=window.MaterialBranding.prefs.sidebarNameVisible;
  const visibilityControl=node("span",{class:"ml-switch-hit"},[visibility,switchControl(visibility,t("显示侧边栏设备名称","Show sidebar device name"))]);
  const nameInput=brandTextField("ml-brand-sidebar-name",t("侧边栏显示名称","Sidebar display name"),window.MaterialBranding.prefs.sidebarName,document.getElementById("ml-sidebar-name")?.dataset.defaultName||"");
  nameInput.disabled=!visibility.checked;bindBrandText(nameInput,"sidebarName");
  visibility.addEventListener("change",()=>{window.MaterialBranding.set("sidebarNameVisible",visibility.checked);nameInput.disabled=!visibility.checked;});
  identity.append(brandRow(t("显示侧边栏设备名称","Show sidebar device name"),t("在侧边栏顶部显示设备名称。","Show the device name above navigation."),visibilityControl));
  const restoreName=textButton(t("恢复设备名称","Restore device name"),()=>{window.MaterialBranding.set("sidebarName","");nameInput.value="";});
  identity.append(brandRow(t("侧边栏显示名称","Sidebar display name"),t("留空时使用设备主机名。","Leave blank to use the router hostname."),node("div",{class:"ml-brand-controls"},[nameInput,restoreName])));
  const palettes=[["MaterialLuCI Classic",[[t("经典蓝","Classic Blue"),"#42A5F5"],["Golden","#CC6F4E"],["Lemon Yellow","#E6A545"],["Grass Green","#7DC22F"],["Charm Purple","#9575CD"],["Sky Blue","#26C6DA"],["Vigour Red","#F06292"],["Fashion Pink","#BA68C8"]]],["Material Colors",[["Blue","#2196F3"],["Teal","#009688"],["Green","#4CAF50"],["Red","#F44336"],["Orange","#FF9800"],["Purple","#9C27B0"],["Cyan","#00BCD4"],["Indigo","#3F51B5"],["Pink","#E91E63"],["Blue Grey","#607D8B"],["Deep Orange","#FF5722"],["Light Green","#8BC34A"]]]];
  function updateSwatches(){host.querySelectorAll(".ml-swatch-item").forEach(b=>{const active=b.dataset.seed===appearance.prefs.seed;b.setAttribute("aria-pressed",String(active));const s=b.querySelector(".ml-swatch");if(s.textContent)s.textContent="";if(s.getAttribute("data-selected")!==String(active))s.setAttribute("data-selected",String(active));s.style.color=MaterialPalette.generate(b.dataset.seed,false).swatchForeground;});}
  for(const [title,colors] of palettes){const g=group(title);g.dataset.group=title==="MaterialLuCI Classic"?"classic":"material";const grid=node("div",{class:"ml-swatches"});for(const [label,color] of colors){const b=textButton(label,()=>{appearance.set("seed",color);hex.value=color;error.textContent="";hex.setAttribute("aria-invalid","false");updateSwatches();},"ml-swatch-item");b.dataset.seed=color;const sw=node("span",{class:"ml-swatch","aria-hidden":"true"});sw.style.background=color;b.prepend(sw);grid.append(b);}g.append(grid);}
  const custom=group(t("自定义强调色","Custom accent")),label=node("label",{for:"ml-hex",text:"HEX"}),hex=node("input",{id:"ml-hex",type:"text",maxlength:7,autocomplete:"off",spellcheck:"false","aria-describedby":"ml-hex-error"}),error=node("div",{id:"ml-hex-error",class:"ml-field-error",role:"status"});
  hex.value=appearance.prefs.seed;hex.addEventListener("input",()=>{const pos=hex.selectionStart;hex.value="#"+hex.value.replace(/[^0-9a-f]/gi,"").slice(0,6).toUpperCase();hex.setSelectionRange(Math.min(pos,hex.value.length),Math.min(pos,hex.value.length));const valid=/^#[0-9A-F]{6}$/.test(hex.value);hex.setAttribute("aria-invalid",String(!valid));error.textContent=valid?"":t("请输入 6 位 HEX 颜色值","Enter a 6 digit HEX color");if(valid){appearance.set("seed",hex.value);updateSwatches();}});
  custom.dataset.group="custom";custom.append(label,hex,error);
  const ranges=group(t("强调色应用","Accent areas"));ranges.dataset.group="ranges";general.after(ranges);host.append(custom);
  ranges.append(prefSwitch("toolbar",t("顶栏背景","Toolbar background"),t("将强调色用于顶栏背景。","Use the accent color for the toolbar.")),prefSwitch("categories",t("分组标题","Section headings"),t("将强调色用于分组标题。","Use the accent color for section headings.")),prefSwitch("icons",t("导航与返回图标","Navigation and back icons"),t("为中性顶栏图标着色。","Accent icons in the neutral toolbar.")));

  updateSwatches();MaterialFeedback.bind(host);
 }
 function allFields(root){
  const selector='[id],[name]';
  return [...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)];
 }
 function appearanceEntry(root){
  if(document.getElementById("ml-appearance-entry")?.isConnected)return;
  const selects=[...(root.matches?.("select")?[root]:[]),...root.querySelectorAll("select")];
  const select=selects.find(s=>/(^|[._])mediaurlbase$/.test(s.name||s.id)||[...s.options].some(o=>o.value.startsWith("/luci-static/")));
  // JS form.ListValue uses widget.cbid.*._mediaurlbase; firmware forks may
  // render a rich dropdown or hidden value instead of a native select.
  const identified=allFields(root).find(el=>/(^|[._])mediaurlbase$/.test(el.name||el.id));
  const field=(select||identified)?.closest(".cbi-value");
  if(!field)return;
  const details=node("details",{id:"ml-appearance-entry",class:"ml-appearance-entry",open:"true"},[node("summary",{text:t("主题外观（此浏览器）","Theme appearance (this browser)")})]);
  const desktop=matchMedia("(min-width:1024px)");
  const syncDisclosure=()=>{if(desktop.matches)details.open=true;};
  const toggle=()=>{if(desktop.matches&&!details.open)details.open=true;if(details.open)openAppearance(details);};
  field.after(details);details.addEventListener("toggle",toggle);
  if(desktop.addEventListener)desktop.addEventListener("change",syncDisclosure);else desktop.addListener(syncDisclosure);
  disclosures.set(details,{destroy(){details.removeEventListener("toggle",toggle);if(desktop.removeEventListener)desktop.removeEventListener("change",syncDisclosure);else desktop.removeListener(syncDisclosure);disclosures.delete(details);}});
  syncDisclosure();if(details.open)openAppearance(details);
 }
 function enhanceSwitch(input){
   if(input.classList.contains("ml-switch")||input.closest(".cbi-dropdown,[role=group]"))return;
   const field=input.closest(".cbi-value-field");
   if(!field||field.querySelectorAll("input[type=checkbox]").length!==1)return;
   input.classList.add("ml-switch");
   const title=input.getAttribute("aria-label")||input.closest(".cbi-value")?.querySelector(".cbi-value-title")?.textContent.trim()||t("开关","Switch");
   if(input.closest("label")){const label=input.closest("label");label.classList.add("ml-switch-hit");label.append(switchControl(input,title));}
   else{const hit=node("span",{class:"ml-switch-hit"});const parent=input.parentNode;parent.insertBefore(hit,input);hit.append(input,switchControl(input,title));}
   if(input.disabled)input.setAttribute("aria-disabled","true");

 }
 const enhancementMetrics={fullScans:0,fastPaths:0,get surfacePasses(){return MaterialSurfaces.count();}};
 const layoutSelectors="select,[id$=mediaurlbase],[name$=mediaurlbase],div.btn,.cbi-checkbox>input[type=checkbox],input.cbi-input-checkbox,.cbi-value-field input[type=checkbox],.cbi-page-actions>input,table,.table,.cbi-section,.cbi-section-node,fieldset,section,.cbi-map,[data-tab],[data-table],.network-status-table,.ml-chart-surface,.ml-table-scroll,#view,.ifacebox-head[style]";
 function enhance(root){
  const viewHost=root.closest?.("#view");
  const needsFirstSurface=viewHost&&viewHost.children.length&&!viewHost.classList.contains("ml-card-surface")&&!viewHost.querySelector(".cbi-map,.cbi-section,fieldset,.ml-card-surface");
  if(root!==main&&!needsFirstSurface&&!root.matches?.(layoutSelectors)&&!root.querySelector?.(layoutSelectors)){
   enhancementMetrics.fastPaths++;
   return;
  }
  enhancementMetrics.fullScans++;
  identifyPage();
  const all=selector=>[...(root.matches&&root.matches(selector)?[root]:[]),...root.querySelectorAll(selector)];
  // Older opkg views use div.btn. Preserve their click handlers and make
  // keyboard behavior and disabled semantics match real buttons.
  for(const button of all('div.btn')){
   if(button.dataset.mlButton)continue;button.dataset.mlButton="true";
   button.setAttribute("role","button");button.tabIndex=button.hasAttribute("disabled")?-1:0;
   if(button.hasAttribute("disabled"))button.setAttribute("aria-disabled","true");
   button.addEventListener("keydown",event=>{if((event.key==="Enter"||event.key===" ")&&!button.hasAttribute("disabled")&&button.getAttribute("aria-disabled")!=="true"){event.preventDefault();button.click();}});
  }
  for(const input of all('.cbi-page-actions>input[type="submit"],.cbi-page-actions>input[type="button"],.cbi-page-actions>input[type="reset"]')){
   if(input.closest(".ml-native-button"))continue;const wrapper=node("span",{class:"ml-native-button"});input.parentNode.insertBefore(wrapper,input);wrapper.append(input);
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
  appearanceEntry(root);
 }
 window.addEventListener("popstate",()=>{if(dialog&&(!history.state||history.state.materialluci!=="dialog"||history.state.id!==dialog.id))finishDialog();setDrawer(false);});
 if(document.querySelector('input[name="luci_password"]'))document.body.classList.add("ml-login");
 MaterialSurfaces.prepare(main);
 enhance(main);
 MaterialRuntime.register({range:true,discoverSelector:'div.btn,.cbi-page-actions>input,.ifacebox-head[style],select,[id$=mediaurlbase],[name$=mediaurlbase]',priority:-20,initial:false,enhance(root){if(root.closest?.("#maincontent,#modal_overlay,.ml-backdrop"))enhance(root);},cleanup(root){MaterialRuntime.cleanup(root,switches,"input");MaterialRuntime.cleanup(root,disclosures,"#ml-appearance-entry");}});
 MaterialRuntime.register({priority:-10,selector:'.cbi-checkbox>input[type="checkbox"],input.cbi-input-checkbox,.cbi-value-field input[type="checkbox"]',enhance:enhanceSwitch});
 MaterialRuntime.registerLayout(records=>{
  if(!disclosures.size||!records.some(r=>[...r.removedNodes].some(n=>n.nodeType===1)))return;
  for(const [details,entry] of [...disclosures])if(!details.isConnected)entry.destroy();
 });
 MaterialRuntime.start(document.body);
 const vv=window.visualViewport,root=document.documentElement;let viewportFrame=0;
 const editorSelector='input:not([type]),input[type=""],input[type=text],input[type=password],input[type=email],input[type=url],input[type=tel],input[type=search],input[type=number],textarea';
 const keyboardInset=()=>narrow.matches&&document.activeElement?.matches(editorSelector)&&vv&&Math.abs(vv.scale-1)<.05?Math.max(0,innerHeight-vv.height-vv.offsetTop):0;
 function viewport(){
  viewportFrame=0;
  const editing=document.activeElement?.matches(editorSelector);
  const drawerOpen=document.body.classList.contains("ml-drawer-open"),modalOpen=document.body.classList.contains("modal-overlay-active")||document.body.classList.contains("ml-dialog-open");
  const inset=editing?keyboardInset():0,keyboardOpen=inset>100;
 
  if(!drawerOpen&&!modalOpen&&!keyboardOpen){
   let cleared=false;
   for(const name of ["--ml-vv-height","--ml-vv-width","--ml-vv-top","--ml-vv-left","--ml-keyboard-space"])if(root.style.getPropertyValue(name)){root.style.removeProperty(name);cleared=true;}
   if(cleared)window.dispatchEvent(new Event("materialluci:viewport"));
   return;
  }
  // Write overlay geometry only while an overlay or editor needs it. This
  // avoids invalidating document-wide inherited styles during ordinary scroll.
  const h=vv?.height||innerHeight,w=vv?.width||innerWidth,top=vv?.offsetTop||0,left=vv?.offsetLeft||0;
  let changed=false;
  const set=(name,value)=>{if(root.style.getPropertyValue(name)!==value){root.style.setProperty(name,value);changed=true;}};
  set("--ml-vv-height",h+"px");set("--ml-vv-width",w+"px");
  set("--ml-vv-top",top+"px");set("--ml-vv-left",left+"px");
  // Add scroll room for the final form field only while an editor is focused.
  set("--ml-keyboard-space",keyboardOpen?inset+"px":"0px");
  if(changed)window.dispatchEvent(new Event("materialluci:viewport"));
 }
 function queueViewport(){if(!viewportFrame)viewportFrame=requestAnimationFrame(viewport);}
 function queueViewportOnScroll(){
  const editing=keyboardInset()>100;
  if(editing||document.body.classList.contains("ml-drawer-open")||document.body.classList.contains("modal-overlay-active")||document.body.classList.contains("ml-dialog-open"))queueViewport();
 }
 if(vv){vv.addEventListener("resize",queueViewport,{passive:true});vv.addEventListener("scroll",queueViewportOnScroll,{passive:true});}
 // Reused LuCI modals may reopen after a viewport resize. Update their
 // geometry immediately when visibility changes, before the first paint.
 let viewportState="";
 const viewportObserver=new MutationObserver(()=>{
  const state=["ml-drawer-open","modal-overlay-active","ml-dialog-open"].map(c=>document.body.classList.contains(c)).join();
  if(state!==viewportState){viewportState=state;queueViewport();}
 });
 viewportObserver.observe(document.body,{attributes:true,attributeFilter:["class"]});
 window.addEventListener("resize",queueViewport,{passive:true});viewport();
 // A one-time focus correction after keyboard resize; avoid scroll-event feedback loops.
 let focusTimer;
 function revealFocused(){
  const el=document.activeElement;
  if(!el?.matches(editorSelector+",select"))return;
  if(vv&&Math.abs(vv.scale-1)>.05)return;
  // Ordinary desktop resize/tab changes must never reposition a form.
  if(!el.closest(".modal,.ml-dialog-body")&&(!narrow.matches||!vv||innerHeight-vv.height<100))return;
  const rect=el.getBoundingClientRect(),top=(vv?.offsetTop||0)+12,bottom=(vv?.offsetTop||0)+(vv?.height||innerHeight)-16;
  const container=el.closest(".modal,.ml-dialog-body"),limits=container?.getBoundingClientRect();
  const title=container?.querySelector(":scope>h4,:scope>h3"),actions=container?.querySelector(":scope>.right");
  const headerBottom=title&&getComputedStyle(title).position==="sticky"?title.getBoundingClientRect().bottom+8:0;
  const actionTop=actions&&getComputedStyle(actions).position==="sticky"?actions.getBoundingClientRect().top-8:bottom;
  const high=Math.max(top,limits?.top||top,headerBottom,container?0:(toolbar?.getBoundingClientRect().bottom||top)+12),low=Math.min(bottom,limits?.bottom||bottom,actionTop);
  const delta=rect.top<high?rect.top-high:rect.bottom>low?Math.min(rect.bottom-low,rect.top-high):0;
  if(delta){if(container)container.scrollBy({top:delta,behavior:"auto"});else window.scrollBy({top:delta,behavior:"auto"});}

 }
 document.addEventListener("focusin",()=>{queueViewport();clearTimeout(focusTimer);focusTimer=setTimeout(revealFocused,280);});
 document.addEventListener("focusout",queueViewport);
 if(vv)vv.addEventListener("resize",()=>{clearTimeout(focusTimer);focusTimer=setTimeout(revealFocused,180);},{passive:true});
 window.addEventListener("pagehide",event=>{cancelAnimationFrame(viewportFrame);viewportFrame=0;clearTimeout(focusTimer);if(!event.persisted)viewportObserver.disconnect();});
 window.addEventListener("pageshow",event=>{if(event.persisted){MaterialRuntime.preparePending();queueViewport();}});
 window.MaterialLuCI={metrics:enhancementMetrics,setMenus:renderMenus,menuFailed(err){const host=document.getElementById("ml-menu-tree");host.replaceChildren(node("p",{class:"hint",text:t("菜单加载失败，请刷新页面。","Menu could not load. Reload the page.")}));console.error(err);},choose,enhance};
 document.documentElement.dataset.loading="false";
})();
