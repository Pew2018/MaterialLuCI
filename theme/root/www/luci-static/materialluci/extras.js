"use strict";
/* Official MDC presentation. Original LuCI nodes and callbacks own data. */
(function(){
 const {MDCMenu,MDCSelect,MDCSnackbar,MDCTooltip}=MaterialMDCControls;
 const selects=new Map(),actions=new Map(),tips=new Map();let sequence=0,notice=null,stopped=false;
 const make=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;if(text!=null)el.textContent=text;return el;};
 function item(label,value,disabled=false,selected=false){
  const li=make("li","mdc-deprecated-list-item"+(selected?" mdc-deprecated-list-item--selected":"")+(disabled?" mdc-deprecated-list-item--disabled":""));
  li.setAttribute("role","option");li.setAttribute("data-value",value);li.setAttribute("aria-selected",String(selected));li.setAttribute("tabindex","-1");
  if(disabled)li.setAttribute("aria-disabled","true");
  li.append(make("span","mdc-deprecated-list-item__ripple"),make("span","mdc-deprecated-list-item__text",label));return li;
 }
 function portalMenu(root){
  root.classList.add("ml-mdc-menu");document.body.append(root);
  const menu=new MDCMenu(root);menu.setIsHoisted(true);menu.setFixedPosition(true);
  menu.wrapFocus=true;menu.hasTypeahead=true;root._mlMdcMenu=menu;return menu;
 }
 function escapeFocus(popup,anchor){
  let restore=false;
  const key=event=>{
   if(event.key==="Escape"&&popup._mlMdcMenu?.open){restore=true;event.preventDefault();event.stopPropagation();popup._mlMdcMenu.open=false;}
  };
  // Escape is valid during opening, before MDC moves focus into the list.
  popup.addEventListener("keydown",key,true);anchor.addEventListener("keydown",key);
  popup._mlEscapeCleanup=()=>anchor.removeEventListener("keydown",key);
  popup.addEventListener("MDCMenuSurface:closed",()=>{
   if(restore&&anchor.isConnected&&!anchor.closest('[disabled],[aria-disabled="true"]')&&!document.body.classList.contains("modal-overlay-active"))anchor.focus({preventScroll:true});
   restore=false;
  });
 }
 function simple(select){return !select.multiple&&select.size<=1&&!select.querySelector("optgroup")&&!select.closest(".cbi-dropdown,.cbi-dynlist")&&!select.hasAttribute("data-ml-native");}
 function hook(object,key,queue,restore){
  const old=Object.getOwnPropertyDescriptor(object,key);let proto=object,desc=old;
  while(!desc&&(proto=Object.getPrototypeOf(proto)))desc=Object.getOwnPropertyDescriptor(proto,key);
  if(!desc?.get||!desc.set||old&&!old.configurable)return;
  Object.defineProperty(object,key,{configurable:true,get(){return desc.get.call(this);},set(value){desc.set.call(this,value);queue();}});
  restore.push(()=>{if(old)Object.defineProperty(object,key,old);else delete object[key];});
 }
 function selectField(select){
  if(selects.has(select)||!simple(select))return;
  if(select===document.activeElement){select.addEventListener("blur",()=>enhance(select),{once:true});return;}
  const id="ml-select-"+(++sequence),root=make("span","mdc-select mdc-select--filled ml-mdc-select");
  const anchor=make("span","mdc-select__anchor");anchor.setAttribute("role","button");anchor.setAttribute("aria-haspopup","listbox");anchor.setAttribute("aria-expanded","false");anchor.tabIndex=0;
  const text=make("span","mdc-select__selected-text");text.id=id;
  const container=make("span","mdc-select__selected-text-container");container.append(text);
  const icon=make("span","mdc-select__dropdown-icon");icon.setAttribute("aria-hidden","true");
  icon.innerHTML='<svg class="mdc-select__dropdown-icon-graphic" viewBox="7 10 10 5" focusable="false"><polygon class="mdc-select__dropdown-icon-inactive" points="7 10 12 15 17 10"></polygon><polygon class="mdc-select__dropdown-icon-active" points="7 15 12 10 17 15"></polygon></svg>';
  anchor.append(make("span","mdc-select__ripple"),container,icon,make("span","mdc-line-ripple"));
  const popup=make("div","mdc-select__menu mdc-menu mdc-menu-surface ml-select-menu"),list=make("ul","mdc-deprecated-list");list.setAttribute("role","listbox");popup.append(list);root.append(anchor,popup);
  // Sibling decoration preserves ui.Select.node.firstChild and original label.
  select.after(root);
  const oldTab=select.getAttribute("tabindex"),oldHidden=select.getAttribute("aria-hidden"),restore=[],optionHooks=new WeakSet();
  let instance,menu,syncing=false,queued=false,signature="",anchorRect=null;
  function queue(){if(!queued){queued=true;queueMicrotask(()=>{queued=false;if(select.isConnected)sync();});}}
  function sync(){
   if(!simple(select)){entry.destroy();return;}
   syncing=true;
   try{
    const options=[...select.options],next=JSON.stringify(options.map(o=>[o.value,o.textContent,o.disabled]));
    if(next!==signature){
     signature=next;list.replaceChildren(...options.map(o=>item(o.textContent,o.value,o.disabled,o.selected)));
     for(const option of options)if(!optionHooks.has(option)){optionHooks.add(option);hook(option,"selected",queue,restore);}
     if(instance){menu.layout();instance.layoutOptions();}
    }
    const label=select.getAttribute("aria-label")||select.labels?.[0]?.textContent.trim()||select.closest(".cbi-value")?.querySelector(".cbi-value-title")?.textContent.trim()||select.name||"选择";
    anchor.setAttribute("aria-label",label);list.setAttribute("aria-label",label);
    const description=select.getAttribute("aria-describedby");if(description)anchor.setAttribute("aria-describedby",description);else anchor.removeAttribute("aria-describedby");
    if(instance){
     instance.disabled=select.disabled;instance.required=select.required;instance.useDefaultValidation=false;
     if(instance.selectedIndex!==select.selectedIndex)instance.setSelectedIndex(select.selectedIndex,true);
     instance.valid=select.validity.valid&&!select.classList.contains("cbi-input-invalid")&&select.getAttribute("aria-invalid")!=="true";
     anchor.setAttribute("aria-invalid",String(!instance.valid));anchor.setAttribute("aria-required",String(select.required));
    }
   }finally{syncing=false;}
  }
  const entry={root,anchor,get menu(){return menu;},get rect(){return anchorRect;},destroy(){
   observer.disconnect();popup._mlEscapeCleanup?.();instance?.destroy();popup.remove();root.remove();select.classList.remove("ml-mdc-native-select");select._mlMdcSelect=null;
   select.removeEventListener("input",queue);select.removeEventListener("change",queue);select.removeEventListener("focus",focus);select.removeEventListener("invalid",invalid);
   select.form?.removeEventListener("reset",reset);restore.forEach(fn=>fn());
   for(const [attr,old] of [["tabindex",oldTab],["aria-hidden",oldHidden]])if(old===null)select.removeAttribute(attr);else select.setAttribute(attr,old);
   selects.delete(select);
  }};
  sync();
  instance=new MDCSelect(root,undefined,undefined,undefined,undefined,el=>{menu=portalMenu(el);return menu;});
  popup.addEventListener("MDCMenuSurface:opening",()=>{anchorRect=anchor.getBoundingClientRect();});escapeFocus(popup,anchor);
  instance.useDefaultValidation=false;root._mlMdcSelect=instance;select._mlMdcSelect=instance;selects.set(select,entry);
  root.addEventListener("MDCSelect:change",()=>{
   if(syncing||select.disabled)return;
   const option=select.options[instance.selectedIndex];
   if(!option||option.disabled){queue();return;}
   if(select.selectedIndex===instance.selectedIndex)return;
   select.selectedIndex=instance.selectedIndex;
   select.dispatchEvent(new Event("input",{bubbles:true}));select.dispatchEvent(new Event("change",{bubbles:true}));queue();
  });
  function focus(){if(!select.disabled)anchor.focus({preventScroll:true});}
  function invalid(event){event.preventDefault();queue();focus();}
  function reset(){setTimeout(queue,0);}
  select.addEventListener("input",queue);select.addEventListener("change",queue);select.addEventListener("focus",focus);select.addEventListener("invalid",invalid);select.form?.addEventListener("reset",reset);
  hook(select,"value",queue,restore);hook(select,"selectedIndex",queue,restore);
  const observer=new MutationObserver(queue);observer.observe(select,{attributes:true,childList:true,subtree:true,characterData:true});
  select.classList.add("ml-mdc-native-select");select.tabIndex=-1;select.setAttribute("aria-hidden","true");sync();
 }
 function actionMenu(owner){
  if(actions.has(owner)||owner.hasAttribute("multiple")||owner.querySelector("input:not([type=hidden]),script,select"))return;
  const arrow=owner.querySelector(":scope > .open"),ul=owner.querySelector(":scope > ul:not(.preview)");
  if(!arrow||!ul)return;
  const popup=make("div","mdc-menu mdc-menu-surface ml-action-menu"),list=make("ul","mdc-deprecated-list");list.setAttribute("role","menu");popup.append(list);
  const menu=portalMenu(popup);let ownerRect=null;popup.addEventListener("MDCMenuSurface:opening",()=>{ownerRect=owner.getBoundingClientRect();});popup.id="ml-menu-"+(++sequence);owner._mlMdcMenu=menu;
  const oldRole=arrow.getAttribute("role"),oldTab=arrow.getAttribute("tabindex");arrow.setAttribute("role","button");arrow.tabIndex=0;
  escapeFocus(popup,arrow);
  arrow.setAttribute("aria-label",document.documentElement.lang.startsWith("zh")?"更多应用选项":"More apply options");arrow.setAttribute("aria-haspopup","menu");arrow.setAttribute("aria-controls",popup.id);arrow.setAttribute("aria-expanded","false");
  function open(event){
   event?.preventDefault();event?.stopImmediatePropagation();
   if(owner.hasAttribute("disabled")||owner.getAttribute("aria-disabled")==="true")return;
   if(menu.open){menu.open=false;arrow.setAttribute("aria-expanded","false");return;}
   const rows=[...ul.children].filter(li=>li.tagName==="LI");
   list.replaceChildren(...rows.map(li=>{const el=item(li.textContent,li.getAttribute("data-value")||"",li.hasAttribute("unselectable")||li.getAttribute("aria-disabled")==="true",li.hasAttribute("selected"));el.setAttribute("role","menuitem");el._nativeChoice=li;return el;}));
   menu.layout();menu.items.forEach((li,i)=>menu.setEnabled(i,li.getAttribute("aria-disabled")!=="true"));
   menu.setAnchorElement(owner);menu.setIsHoisted(true);menu.setFixedPosition(true);menu.open=true;arrow.setAttribute("aria-expanded","true");
  }
  function key(event){if(["Enter"," ","ArrowDown","ArrowUp"].includes(event.key))open(event);}
  function click(event){if(event.target===arrow||arrow.contains(event.target))open(event);}
  owner.addEventListener("click",click,true);arrow.addEventListener("keydown",key);
  popup.addEventListener("MDCMenu:selected",event=>{
   const li=event.detail.item?._nativeChoice;
   if(!li||li.hasAttribute("unselectable")||owner.hasAttribute("disabled"))return;
   // Native event invokes LuCI's toggleItem / saveValues and original callbacks.
   li.dispatchEvent(new CustomEvent("cbi-dropdown-select",{bubbles:true}));arrow.focus({preventScroll:true});
  });
  popup.addEventListener("MDCMenuSurface:closed",()=>{arrow.setAttribute("aria-expanded",String(menu.open));});
  actions.set(owner,{open,get rect(){return ownerRect;},destroy(){popup._mlEscapeCleanup?.();menu.destroy();popup.remove();owner.removeEventListener("click",click,true);arrow.removeEventListener("keydown",key);owner._mlMdcMenu=null;for(const a of ["aria-label","aria-haspopup","aria-controls","aria-expanded"])arrow.removeAttribute(a);for(const [a,v] of [["role",oldRole],["tabindex",oldTab]])if(v===null)arrow.removeAttribute(a);else arrow.setAttribute(a,v);actions.delete(owner);}});
 }
 function tooltip(anchor){
  const label=anchor.getAttribute("aria-label")||anchor.title;if(!label)return;
  const known=tips.get(anchor);if(known){known.surface.textContent=label;return;}
  const id="ml-tooltip-"+(++sequence),root=make("div","mdc-tooltip"),surface=make("div","mdc-tooltip__surface mdc-tooltip__surface-animation",label);
  root.id=id;root.setAttribute("role","tooltip");root.setAttribute("aria-hidden","true");root.append(surface);document.body.append(root);
  const description=anchor.getAttribute("aria-describedby"),title=anchor.getAttribute("title"),data=anchor.getAttribute("data-tooltip-id");
  anchor.setAttribute("aria-describedby",[description,id].filter(Boolean).join(" "));anchor.setAttribute("data-tooltip-id",id);anchor.removeAttribute("title");
  const instance=new MDCTooltip(root);instance.setShowDelay(500);anchor._mlMdcTooltip=instance;
  tips.set(anchor,{surface,destroy(){instance.destroy();root.remove();anchor._mlMdcTooltip=null;for(const [a,v] of [["aria-describedby",description],["title",title],["data-tooltip-id",data]])if(v===null)anchor.removeAttribute(a);else anchor.setAttribute(a,v);tips.delete(anchor);}});
 }
 // Run before the surface's later body capture listener so clicking the
 // native arrow toggles once instead of closing and immediately reopening.
 document.body.addEventListener("click",event=>{
  const arrow=event.target.closest?.(".cbi-dropdown.btn>.open,.cbi-dropdown.cbi-button>.open");
  const entry=arrow&&actions.get(arrow.parentElement);if(entry)entry.open(event);
 },true);
 function feedback(message){
  if(!notice){
   const root=make("aside","mdc-snackbar ml-preference-snackbar"),surface=make("div","mdc-snackbar__surface"),label=make("div","mdc-snackbar__label");
   surface.setAttribute("role","status");surface.setAttribute("aria-live","polite");surface.setAttribute("aria-relevant","additions");label.setAttribute("aria-atomic","false");
   surface.append(label);root.append(surface);document.body.append(root);const instance=new MDCSnackbar(root);instance.timeoutMs=4000;notice={root,instance,timer:0};root._mlMdcSnackbar=instance;
  }
  clearTimeout(notice.timer);notice.timer=setTimeout(()=>{if(document.body.classList.contains("modal-overlay-active"))return;notice.instance.labelText=message;notice.instance.open();},200);
 }
 function enhance(scope=document){
  if(stopped)return;
  const all=s=>[...(scope.matches?.(s)?[scope]:[]),...scope.querySelectorAll(s)];
  for(const select of all("select"))selectField(select);
  for(const owner of all(".cbi-dropdown.btn,.cbi-dropdown.cbi-button"))actionMenu(owner);
  for(const anchor of all(".ml-icon-button,.ml-poll-action,#ml-drawer-close,button[aria-label]:has(svg):not(.mdc-switch)"))tooltip(anchor);
 }
 let pending=false;
 const observer=new MutationObserver(records=>{
  for(const [el,entry] of selects)if(!el.isConnected||!entry.root.isConnected)entry.destroy();
  for(const [el,entry] of actions)if(!el.isConnected)entry.destroy();
  for(const [el,entry] of tips)if(!el.isConnected)entry.destroy();
  const relevant=records.some(r=>r.type==="childList"&&[...r.addedNodes].some(n=>n.nodeType===1&&!n.matches(".mdc-tooltip,.ml-mdc-menu,.mdc-snackbar"))||r.type==="attributes"&&r.target.matches(".ml-icon-button,.ml-poll-action,#ml-drawer-close"));
  if(relevant&&!pending){pending=true;queueMicrotask(()=>{pending=false;enhance(document);});}
 });
 observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["aria-label","title"]});
 function closeMenus(event){for(const e of selects.values()){const r=e.anchor.getBoundingClientRect();if(event?.type!=="scroll"||!e.rect||Math.abs(r.top-e.rect.top)>1||Math.abs(r.left-e.rect.left)>1)e.menu.open=false;}for(const [el,e] of actions){const r=el.getBoundingClientRect();if(event?.type!=="scroll"||!e.rect||Math.abs(r.top-e.rect.top)>1||Math.abs(r.left-e.rect.left)>1)el._mlMdcMenu.open=false;}for(const el of tips.keys())el._mlMdcTooltip.hide();}
 // Menus close during viewport movement instead of remaining detached from anchors.
 window.addEventListener("resize",closeMenus);document.addEventListener("scroll",event=>{if(!event.target.closest?.(".ml-mdc-menu"))closeMenus(event);},{capture:true,passive:true});
 document.addEventListener("change",event=>{if(event.target.closest("#ml-appearance"))feedback(document.documentElement.lang.startsWith("zh")?"已保存此浏览器的主题设置":"Theme preferences saved in this browser");});
 document.addEventListener("click",event=>{if(event.target.closest("#ml-appearance .ml-swatch-item,#ml-appearance .ml-mode-option"))feedback(document.documentElement.lang.startsWith("zh")?"已保存此浏览器的主题设置":"Theme preferences saved in this browser");});
 window.addEventListener("pagehide",event=>{if(!event.persisted){stopped=true;observer.disconnect();for(const e of [...selects.values()])e.destroy();for(const e of [...actions.values()])e.destroy();for(const e of [...tips.values()])e.destroy();if(notice){clearTimeout(notice.timer);notice.instance.destroy();notice.root.remove();notice=null;}}});
 window.MaterialExtras={enhance,feedback,menu(anchor,options,value,onChange){
  const popup=make("div","mdc-menu mdc-menu-surface ml-action-menu"),list=make("ul","mdc-deprecated-list");list.setAttribute("role","menu");list.append(...options.map(([key,label,disabled])=>{const li=item(label,key,disabled,key===value);li.setAttribute("role","menuitem");return li;}));popup.append(list);const menu=portalMenu(popup);escapeFocus(popup,anchor);menu.setAnchorElement(anchor);
  menu.items.forEach((li,i)=>menu.setEnabled(i,li.getAttribute("aria-disabled")!=="true"));
  popup.addEventListener("MDCMenu:selected",event=>onChange(event.detail.item.dataset.value),{once:true});
  popup.addEventListener("MDCMenuSurface:closed",()=>{popup._mlEscapeCleanup?.();menu.destroy();popup.remove();},{once:true});menu.open=true;return menu;
 },counts(){return {selects:selects.size,menus:actions.size,tooltips:tips.size};}};
 enhance();
})();
