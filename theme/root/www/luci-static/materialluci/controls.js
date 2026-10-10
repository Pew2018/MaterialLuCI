"use strict";
/* MDC enhancement layer. No cloned form values, RPC, ACL or route changes. */
(function(){
 const {MDCCheckbox,MDCRadio,MDCFormField,MDCDialog}=MaterialMDCControls;
 const selections=new Map(),dialogs=new Map();
 function element(tag,cls){const el=document.createElement(tag);el.className=cls;el.setAttribute("aria-hidden","true");return el;}
 function selection(input){
  if(selections.has(input)||input.closest(".ml-switch-hit,.cbi-dropdown,.cbi-dynlist"))return;
  const booleanField=input.closest(".cbi-value-field");
  if(input.type==="checkbox"&&(input.classList.contains("ml-switch")||(booleanField&&booleanField.querySelectorAll('input[type="checkbox"]').length===1&&!input.closest('[role="group"]'))))return;
  // Reuse LuCI's existing frame: its input/label/description sibling sequence
  // is used directly by ui.Select. Never insert a wrapper between them.
  const root=input.parentElement;
  if(!root?.matches(".cbi-checkbox,.cbi-radio,.ml-radio,[data-ml-selection]")||root.querySelectorAll("input:not([type=hidden])").length!==1)return;
  const radio=input.type==="radio",kind=radio?"radio":"checkbox",prefix="mdc-"+kind;
  const style=getComputedStyle(root),oldDisplay=style.display,indeterminate=input.indeterminate;
  const existingHooks=["checked","disabled","indeterminate"].some(key=>Object.getOwnPropertyDescriptor(input,key));if(existingHooks)return;
  root.classList.add(prefix,"ml-mdc-selection");root.style.display=oldDisplay;
  input.classList.add(prefix+"__native-control");
  const background=element("span",prefix+"__background");
  if(radio)background.append(element("span",prefix+"__outer-circle"),element("span",prefix+"__inner-circle"));
  else{background.innerHTML='<svg class="mdc-checkbox__checkmark" viewBox="0 0 24 24"><path class="mdc-checkbox__checkmark-path" fill="none" d="M1.73,12.91 8.1,19.28 22.79,4.59"/></svg>';background.append(element("span",prefix+"__mixedmark"));}
  const ripple=element("span",prefix+"__ripple"),focus=element("span",prefix+"__focus-ring");
  root.append(background,ripple,focus);
  const instance=radio?new MDCRadio(root):new MDCCheckbox(root);
  if(!radio)instance.indeterminate=indeterminate;
  root._mlMdcSelection=instance;input._mlMdcSelection=instance;
  let formField=null;
  const label=root.querySelector("label");
  if(label){root.classList.add("mdc-form-field");formField=new MDCFormField(root);formField.input=instance;}
  function geometry(){if(!input.isConnected)return;root.style.setProperty("--ml-selection-left",input.offsetLeft+"px");root.style.setProperty("--ml-selection-top",input.offsetTop+"px");}
  const resize=new ResizeObserver(geometry);resize.observe(root);geometry();
  const sync=()=>{if(radio){if(root.classList.contains("mdc-radio--disabled")!==input.disabled)instance.disabled=input.disabled;}else{instance.checked=input.checked;instance.indeterminate=input.indeterminate;}geometry();};
  const attrs=new MutationObserver(sync);attrs.observe(input,{attributes:true,attributeFilter:["checked","disabled"]});
  const reset=()=>setTimeout(sync,0);document.addEventListener("reset",reset,true);
  selections.set(input,{destroy(){
   attrs.disconnect();resize.disconnect();document.removeEventListener("reset",reset,true);formField?.destroy();instance.destroy();
   root._mlMdcSelection=null;input._mlMdcSelection=null;input.classList.remove(prefix+"__native-control");root.classList.remove(prefix,"ml-mdc-selection","mdc-form-field");background.remove();ripple.remove();focus.remove();selections.delete(input);
  }});
 }
 function enhance(root=document){
  if(root.matches?.('input[type="checkbox"],input[type="radio"]'))selection(root);
  root.querySelectorAll?.('input[type="checkbox"],input[type="radio"]').forEach(selection);
 }
 function focusable(panel){return [...panel.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]')].filter(el=>el.getClientRects().length&&!el.closest('[inert],[aria-hidden="true"]'));}
 function dialog(root,panel,restore=false){
  if(dialogs.has(root))return dialogs.get(root);
  root.classList.add("mdc-dialog","ml-mdc-dialog");
  // LuCI owns modal_overlay.firstElementChild and every modal child. The
  // existing surface also serves as MDC's container/content; no reparenting.
  panel.classList.add("mdc-dialog__container","mdc-dialog__surface");
  const content=panel.querySelector(".ml-dialog-body")||panel;content.classList.add("mdc-dialog__content");
  const focused=document.activeElement;
  let listening=false;
  function keydown(event){
   if(event.key!=="Tab")return;
   const fields=focusable(panel);if(!fields.length){event.preventDefault();return;}
   const first=fields[0],last=fields[fields.length-1],outside=!panel.contains(document.activeElement);
   if(outside||event.shiftKey&&document.activeElement===first||!event.shiftKey&&document.activeElement===last){event.preventDefault();(event.shiftKey?last:first).focus({preventScroll:true});}
  }
  // Supported MDC focus-trap factory preserves the LuCI business child list.
  // MDC's default sentinel nodes would break lastChild/firstElementChild.
  const trap={trapFocus(){if(!listening){listening=true;document.addEventListener("keydown",keydown,true);}},releaseFocus(){if(listening){listening=false;document.removeEventListener("keydown",keydown,true);}if(restore&&panel.contains(document.activeElement)&&focused?.isConnected&&!focused.closest("[inert]"))focused.focus({preventScroll:true});}};
  const instance=new MDCDialog(root,undefined,()=>trap);
  instance.escapeKeyAction="";instance.scrimClickAction="";instance.autoStackButtons=false;
  root._mlMdcDialog=instance;
  const entry={instance,panel,destroy(){
   instance.close();trap.releaseFocus();instance.destroy();root._mlMdcDialog=null;
   root.classList.remove("mdc-dialog--open","mdc-dialog--opening","mdc-dialog--closing");dialogs.delete(root);
   if(!dialogs.size)document.body.classList.remove("mdc-dialog-scroll-lock");
  }};
  dialogs.set(root,entry);trap.trapFocus();instance.open();return entry;
 }
 function syncLuCI(){
  const root=document.getElementById("modal_overlay"),panel=root?.querySelector(":scope > .modal");
  if(!root||!panel)return;
  const active=document.body.classList.contains("modal-overlay-active"),current=dialogs.get(root);
  if(!active){current?.destroy();return;}
  for(const cls of ["mdc-dialog__container","mdc-dialog__surface","mdc-dialog__content"])if(!panel.classList.contains(cls))panel.classList.add(cls);
  const title=panel.querySelector(":scope > h4,:scope > h3");
  if(title){if(!title.id)title.id="ml-luci-modal-title";panel.setAttribute("aria-labelledby",title.id);}
  if(!current)dialog(root,panel,true);
 }
 let scheduled=false;
 new MutationObserver(records=>{
  for(const record of records)for(const n of record.addedNodes)if(n.nodeType===1)enhance(n);
  for(const [input,entry] of selections)if(!input.isConnected)entry.destroy();
  for(const [root,entry] of dialogs)if(!root.isConnected)entry.destroy();
  if(!scheduled){scheduled=true;queueMicrotask(()=>{scheduled=false;syncLuCI();});}
 }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
 window.addEventListener("pagehide",event=>{if(!event.persisted){for(const entry of [...dialogs.values()])entry.destroy();for(const entry of [...selections.values()])entry.destroy();}});
 window.MaterialControls={enhance,dialog,closeDialog(root){dialogs.get(root)?.destroy();},count(){return {selections:selections.size,dialogs:dialogs.size};}};
 enhance();syncLuCI();
})();
