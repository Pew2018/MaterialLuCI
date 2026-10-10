"use strict";
/* Official MDC presentation around the ORIGINAL LuCI fields. No values,
   events, validators, names, IDs or widget instances are replaced. */
(function(){
 const fields=new Map();
 const eligible=input=>input.tagName==="TEXTAREA"||["text","password","email","url","tel","search","number"].includes(input.type);
 function enhance(scope){
  const inputs=[...(scope.matches?.("input,textarea")?[scope]:[]),...scope.querySelectorAll("input,textarea")];
  for(const input of inputs){
   if(!eligible(input)||fields.has(input)||input.closest(".mdc-text-field"))continue;
   const parent=input.parentElement;
   // Textarea.getValue() uses frame.firstElementChild; password reveal uses
   // button.previousElementSibling. Reuse these frames, append decorations.
   const peers=[...parent.querySelectorAll("input,textarea,select")].filter(el=>el.type!=="hidden");
   const reuse=parent.matches("div,span,label")&&!parent.matches(".cbi-value,.cbi-value-field,.cbi-map,.cbi-section,.modal,.ml-group")&&peers.length===1&&parent.firstElementChild===input;
   const root=reuse?parent:document.createElement("span");
   if(!reuse){parent.insertBefore(root,input);root.append(input);}
   const addedClasses=["ml-text-field","mdc-text-field","mdc-text-field--filled","mdc-text-field--no-label"];
   if(input.tagName==="TEXTAREA")addedClasses.push("mdc-text-field--textarea");
   root.classList.add(...addedClasses);input.classList.add("mdc-text-field__input");
   const ripple=document.createElement("span"),line=document.createElement("span");
   ripple.className="mdc-text-field__ripple";line.className="mdc-line-ripple";
   ripple.setAttribute("aria-hidden","true");line.setAttribute("aria-hidden","true");
   root.append(ripple,line);
   let labelAdded=false;
   if(!input.getAttribute("aria-label")&&!input.getAttribute("aria-labelledby")&&!input.labels?.length){
    const title=input.closest(".cbi-value")?.querySelector(".cbi-value-title")?.textContent.trim()||input.placeholder||input.name;
    if(title){input.setAttribute("aria-label",title);labelAdded=true;}
   }
   let instance;
   try{instance=new MaterialMDCTextField.MDCTextField(root);}
   catch(error){
    console.error("MaterialLuCI: MDCTextField initialization failed",error);
    root.classList.remove(...addedClasses);input.classList.remove("mdc-text-field__input");ripple.remove();line.remove();
    if(!reuse){root.replaceWith(input);}if(labelAdded)input.removeAttribute("aria-label");continue;
   }
   root._mlMdcTextField=instance;
   // LuCI owns custom validation and error messages, including dependencies.
   instance.useNativeValidation=false;
   let syncing=false;
   const sync=()=>{
    if(syncing)return;syncing=true;
    try{
     instance.disabled=!!input.disabled;
     instance.valid=input.getAttribute("aria-invalid")!=="true"&&!input.classList.contains("cbi-input-invalid")&&!input.closest(".cbi-value-error");
     if(input===document.activeElement&&!root.classList.contains("mdc-text-field--focused"))instance.foundation.activateFocus();
    }finally{syncing=false;}
   };
   let descriptorInstalled=false;
   if(!Object.getOwnPropertyDescriptor(input,"disabled")){
    const prototype=input.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
    const descriptor=Object.getOwnPropertyDescriptor(prototype,"disabled");
    Object.defineProperty(input,"disabled",{configurable:true,get(){return descriptor.get.call(this);},set(value){descriptor.set.call(this,value);sync();}});
    descriptorInstalled=true;
   }
   const observer=new MutationObserver(sync);
   observer.observe(input,{attributes:true,attributeFilter:["disabled","readonly","class","aria-invalid"]});
   input.addEventListener("input",sync);input.addEventListener("change",sync);input.addEventListener("blur",sync);
   const reset=()=>setTimeout(sync,0);document.addEventListener("reset",reset,true);
   fields.set(input,{root,destroy(){
    observer.disconnect();instance.destroy();root._mlMdcTextField=null;
    input.removeEventListener("input",sync);input.removeEventListener("change",sync);input.removeEventListener("blur",sync);
    document.removeEventListener("reset",reset,true);if(descriptorInstalled)delete input.disabled;
    input.classList.remove("mdc-text-field__input");root.classList.remove(...addedClasses);
    ripple.remove();line.remove();if(labelAdded)input.removeAttribute("aria-label");
    if(!reuse&&root.isConnected&&input.parentElement===root)root.replaceWith(input);
    fields.delete(input);
   }});
   sync();
  }
 }
 new MutationObserver(()=>{for(const [input,entry] of fields)if(!input.isConnected||!entry.root.contains(input))entry.destroy();}).observe(document.body,{childList:true,subtree:true});
 window.addEventListener("pagehide",event=>{if(!event.persisted)for(const entry of [...fields.values()])entry.destroy();});
 window.MaterialTextFields={enhance};
})();
