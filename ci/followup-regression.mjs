import {chromium} from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
const base="build/stage/www/luci-static/materialluci/",source="theme/root/www/luci-static/materialluci/";
const browser=await chromium.launch(),results=[];
try{
 for(const design of ["classic","m3e"]){
  const page=await browser.newPage({viewport:{width:390,height:800}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.setContent('<html lang="en"><body><main id="maincontent"><div id="view"></div></main><div id="indicators"><span data-indicator="poll-status" data-style="inactive">Paused</span></div><div id="modal_overlay"><div class="modal"><h4>Title</h4><input></div></div></body></html>');
  for(const f of ["mdc-linear-progress.css","cascade.css","design-m3.css"])await page.addStyleTag({path:base+f});
  await page.evaluate(design=>{
   document.documentElement.dataset.design=design;document.documentElement.dataset.cards="true";
   window.MaterialAppearance={activeDesign:design};
   window._=s=>s;window.DOM={content(n,c){n.replaceChildren(c);},append(n,c){if(c)n.append(c);}};
   window.E=(tag,attrs,text)=>{const n=document.createElement(tag);for(const [k,v] of Object.entries(attrs||{}))n.setAttribute(k,v);if(text)n.textContent=text;return n;};
   window.LuCI=function(){};
   LuCI.prototype.bind=(fn,self)=>fn.bind(self);
   LuCI.prototype.error=e=>{const n=E("div",{class:"alert-message danger"},e.message);maincontent.prepend(n);console.error(e);throw e;};
   window.L={view:function(){}};
  },design);
  await page.addScriptTag({path:"ci/fixtures/view-init-21.02.js"});
  await page.evaluate(()=>{L.view.prototype.__init__=NativeViewInit;window.nativeInit=NativeViewInit;});
  for(const f of ["material-web.js","mdc-linear-progress.js","mdc-controls.js","runtime.js","components.js","surfaces.js","feedback.js","extras.js","controls.js","wait.js"])await page.addScriptTag({path:base+f});
  await page.evaluate(()=>{
   MaterialRuntime.start(document.body);
   window.enter=()=>{
    const view={load(){return new Promise((resolve,reject)=>{window.finishLoad=resolve;window.failLoad=reject;});},render(){return new Promise(resolve=>window.finishRender=resolve);},addFooter(){return E("footer",{},"Footer");}};
    window.currentPromise=L.view.prototype.__init__.call(view);
    return true;
   };enter();
  });
  await page.waitForFunction(()=>MaterialWait.activeCount()===1);
  await page.evaluate(()=>{Promise.reject(new Error("unrelated-fixture"));});
  await page.waitForTimeout(30);
  assert.equal(await page.evaluate(()=>MaterialWait.activeCount()),1);
  await page.evaluate(()=>{const local=E("section",{},null);local.append(E("div",{class:"alert-message danger"},"Local"));document.getElementById("view").append(local);});
  await page.waitForTimeout(30);
  assert.equal(await page.evaluate(()=>MaterialWait.activeCount()),1,"local danger is not a view failure");
  await page.evaluate(()=>finishLoad("data"));
  await page.waitForFunction(()=>typeof finishRender==="function");
  assert.equal(await page.evaluate(()=>MaterialWait.activeCount()),1,"render still pending");
  await page.evaluate(()=>finishRender(E("p",{},"Done")));
  await page.waitForFunction(()=>MaterialWait.activeCount()===0);
  await page.evaluate(()=>enter());
  await page.waitForFunction(()=>MaterialWait.activeCount()===1);
  await page.evaluate(()=>failLoad(new Error("view-failure-fixture")));
  await page.waitForFunction(()=>MaterialWait.activeCount()===0);
  assert.equal(await page.locator("#view>.spinning").count(),1,"native failure retains loader");
  await page.evaluate(()=>{MaterialWait.sync();dispatchEvent(new PageTransitionEvent("pagehide",{persisted:true}));dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true}));});
  assert.equal(await page.evaluate(()=>MaterialWait.activeCount()),0,"failed view must not restart in bfcache");
  // A new loader in the same #view is a new generation.
  await page.evaluate(()=>enter());
  await page.waitForFunction(()=>MaterialWait.activeCount()===1);
  await page.evaluate(()=>{const n=E("div",{id:"view"},"Replacement");document.getElementById("view").replaceWith(n);});
  await page.waitForFunction(()=>MaterialWait.activeCount()===0);
  await page.evaluate(()=>enter());
  await page.waitForFunction(()=>MaterialWait.activeCount()===1);
  await page.evaluate(()=>document.getElementById("view").remove());
  await page.waitForFunction(()=>MaterialWait.activeCount()===0);
  await page.evaluate(()=>maincontent.append(E("div",{id:"view"},"Ready")));

  // Dynamic list: button.cbi-button add row and compact existing-item action.
  await page.evaluate(()=>{document.getElementById("view").innerHTML='<div class="cbi-dynlist"><div class="item"><span>entry</span><button id="delete" class="cbi-button cbi-button-remove" type="button">Delete</button></div><div class="add-item"><input type="text"><button id="add" class="cbi-button" type="button">Add</button></div></div>';});
  const read=()=>page.evaluate(()=>({add:add.getBoundingClientRect().height,del:document.getElementById("delete").getBoundingClientRect().height,radius:getComputedStyle(add).borderRadius}));
  const before=await read();
  await page.evaluate(()=>MaterialFeedback.bind(document.getElementById("view")));
  await page.waitForFunction(()=>document.querySelector("#add md-ripple,#add .mdc-button__ripple"));
  const after=await read();assert.equal(before.add,after.add);assert.equal(after.add,48);if(design==="m3e"){assert.equal(after.del,36);assert.equal(after.radius,"24px");}

  await page.locator("#add").focus();
  assert.equal(await page.locator("#add").evaluate(n=>getComputedStyle(n).outlineWidth),"2px");
  await page.evaluate(()=>{add.disabled=true;});
  await page.waitForFunction(()=>document.querySelector("#add md-ripple")?.disabled||document.querySelector("#add .mdc-button__ripple"));
  assert.equal(await page.locator("#add").evaluate(n=>n.disabled),true);
  await page.evaluate(()=>{add.disabled=false;});
  await page.evaluate(()=>{const n=add.cloneNode(false);n.id="added-later";n.textContent="Add later";add.replaceWith(n);});
  await page.waitForFunction(()=>document.querySelector("#added-later md-ripple,#added-later .mdc-button__ripple"));
  assert.equal(await page.locator("#added-later").evaluate(n=>n.getBoundingClientRect().height),48);

  // Execute authored poll code: native first text and native handler contract.
  const app=fs.readFileSync(source+"app.js","utf8"),poll=app.slice(app.indexOf(' const indicators='),app.indexOf(' const narrow='));
  await page.addScriptTag({content:'(function(){const t=(a,b)=>document.documentElement.lang.startsWith("zh")?a:b;'+poll+'window.syncPoll=syncPollIndicator;})();'});
  await page.evaluate(()=>{MaterialExtras.enhance(indicators);window.pollNode=indicators.firstElementChild;window.pollText=pollNode.firstChild;});
  await page.waitForFunction(()=>!!pollNode._mlMdcTooltip);
  const writes=await page.evaluate(async()=>{
   const records=[];const o=new MutationObserver(r=>records.push(...r));o.observe(pollNode,{attributes:true});
   for(let i=0;i<20;i++)syncPoll();await Promise.resolve();o.disconnect();return records.map(r=>r.attributeName);
  });assert.deepEqual(writes,[]);
  assert.equal(await page.evaluate(()=>pollNode.hasAttribute("title")),false);
  assert.equal(await page.evaluate(()=>pollNode.firstChild===pollText),true);
  await page.evaluate(()=>{window.pollCalls=[];L.require=()=>Promise.resolve({start(){pollCalls.push("start");},stop(){pollCalls.push("stop");}});pollNode.click();});
  await page.waitForFunction(()=>pollCalls.length===1&&pollNode.dataset.paused==="false");
  assert.equal(await page.evaluate(()=>document.querySelector("#"+pollNode.dataset.tooltipId).textContent),"Automatic refresh running");
  await page.evaluate(()=>{pollNode.click();});
  await page.waitForFunction(()=>pollCalls.length===2&&pollNode.dataset.paused==="true");
  await page.evaluate(()=>{
   const n=E("span",{"data-indicator":"poll-status","data-style":"active","data-clickable":"true"},"Refreshing");
   window.nativeClicks=0;n.addEventListener("click",()=>nativeClicks++);pollNode.replaceWith(n);window.pollNode=n;window.pollText=n.firstChild;
  });
  await page.waitForFunction(()=>!!pollNode._mlMdcTooltip);
  await page.evaluate(()=>pollNode.click());assert.equal(await page.evaluate(()=>nativeClicks),1);assert.equal(await page.evaluate(()=>pollCalls.length),2);
  assert.equal(await page.locator(".mdc-tooltip").count(),1);
  await page.evaluate(()=>{document.documentElement.lang="zh";syncPoll();});
  assert.equal(await page.evaluate(()=>pollNode.getAttribute("aria-label")),"暂停自动刷新");
  assert.equal(await page.evaluate(()=>pollNode.hasAttribute("title")),false);

  // Spy on actual manual MDC ripple owners, never substitute a ripple stub.
  await page.evaluate(()=>{window.rippleCreated=0;window.rippleDestroyed=0;});
  // extras closes over constructor; reload after existing instances are disposed.
  await page.evaluate(()=>dispatchEvent(new PageTransitionEvent("pagehide",{persisted:false})));
  await page.addScriptTag({path:base+"runtime.js"});
  // Export getters are read-only. Instrument the actual manual constructor
  // call, with a Proxy forwarding to the real bundled MDC implementation.
  let extras=fs.readFileSync(source+"extras.js","utf8");
  extras=extras.replace(" const make=", ' const RippleSpy=new Proxy(MDCRipple,{construct(Target,args){const instance=Reflect.construct(Target,args);rippleCreated++;const destroy=instance.destroy.bind(instance);instance.destroy=()=>{rippleDestroyed++;return destroy();};return instance;}});\n const make=').replace("new MDCRipple(li)","new RippleSpy(li)");
  await page.addScriptTag({content:extras});
  await page.evaluate(()=>MaterialRuntime.start(document.body));
  await page.evaluate(()=>{window.anchor=E("button",{type:"button"},"Menu");document.body.append(anchor);});
  for(const mode of ["close","escape","selected","remove-anchor","remove-popup"]){
   await page.evaluate(()=>{window.menuChoice=null;anchor.focus();window.menu=MaterialExtras.menu(anchor,[["a","A"],["b","B",true]],"a",v=>menuChoice=v);window.popup=document.querySelector(".ml-action-menu");});
   await page.waitForFunction(()=>menu.open);
   if(mode==="escape")await page.evaluate(()=>anchor.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true})));
   else if(mode==="selected")await page.evaluate(()=>{popup.dispatchEvent(new CustomEvent("MDCMenu:selected",{detail:{item:popup.querySelector("li")}}));menu.open=false;});
   else if(mode==="remove-anchor")await page.evaluate(()=>{anchor.remove();MaterialRuntime.cleanup;/* adapter cleanup dispatched below */});
   else if(mode==="remove-popup")await page.evaluate(()=>popup.remove());
   else await page.evaluate(()=>{menu.open=false;menu.open=false;});

   await page.waitForFunction(()=>!document.querySelector(".ml-action-menu"));
   assert.ok(await page.evaluate(()=>rippleCreated)>0,"spy must observe real constructors");
   assert.equal(await page.evaluate(()=>rippleCreated),await page.evaluate(()=>rippleDestroyed));
   if(mode==="escape")assert.equal(await page.evaluate(()=>document.activeElement===anchor),true);
   if(mode==="selected")assert.equal(await page.evaluate(()=>menuChoice),"a");
   if(mode==="remove-anchor")await page.evaluate(()=>document.body.append(anchor));
   const dismissals=await page.evaluate(()=>MaterialExtras.counts().scrollDismissals);
   await page.evaluate(()=>{popup.dispatchEvent(new CustomEvent("MDCMenuSurface:opened"));popup.dispatchEvent(new CustomEvent("MDCMenuSurface:closed"));document.dispatchEvent(new WheelEvent("wheel",{bubbles:true}));});
   assert.equal(await page.evaluate(()=>MaterialExtras.counts().scrollDismissals),dismissals,"late portal events must not resurrect closed menu ownership");
  }
  const temporaryBalance=await page.evaluate(()=>({created:rippleCreated,destroyed:rippleDestroyed}));
  // Scoped modal adapter: visibility, panel/overlay replacement, heading title.
  await page.evaluate(()=>{document.body.classList.add("modal-overlay-active");});
  // Previous permanent pagehide stopped adapters: test fresh controls/runtime.
  await page.addScriptTag({path:base+"controls.js"});
  await page.evaluate(()=>MaterialRuntime.start(document.body));
  await page.waitForFunction(()=>MaterialControls.count().dialogs===1);
  await page.evaluate(()=>{document.querySelector("#modal_overlay>.modal").outerHTML='<div class="modal"><h4 id="new-title">New</h4><input></div>';});
  await page.waitForFunction(()=>document.querySelector("#modal_overlay>.modal").getAttribute("aria-labelledby")==="new-title");
  await page.evaluate(()=>{const n=E("div",{id:"modal_overlay"});n.innerHTML='<div class="modal"><h3 id="replacement-title">Replacement</h3><input></div>';document.getElementById("modal_overlay").replaceWith(n);});
  await page.waitForFunction(()=>document.querySelector("#modal_overlay>.modal").getAttribute("aria-labelledby")==="replacement-title"&&MaterialControls.count().dialogs===1);
  await page.evaluate(()=>document.body.classList.remove("modal-overlay-active"));
  await page.waitForFunction(()=>MaterialControls.count().dialogs===0);

  // Execute the authored appearance entry and cleanup via the shared runtime.
  await page.evaluate(()=>{
   window.mediaAdds=0;window.mediaRemoves=0;window.mediaCallbacks=new Set();
   window.realMatchMedia=window.matchMedia;
   window.matchMedia=query=>{const m=realMatchMedia(query);return {get matches(){return m.matches;},addEventListener(type,fn){mediaAdds++;mediaCallbacks.add(fn);m.addEventListener(type,fn);},removeEventListener(type,fn){mediaRemoves++;mediaCallbacks.delete(fn);m.removeEventListener(type,fn);},addListener(fn){mediaAdds++;mediaCallbacks.add(fn);m.addListener(fn);},removeListener(fn){mediaRemoves++;mediaCallbacks.delete(fn);m.removeListener(fn);}};};
   document.getElementById("view").innerHTML='<div class="cbi-value"><select name="mediaurlbase"><option value="/luci-static/materialluci">Material</option></select></div>';
  });
  const entry=app.slice(app.indexOf(' function allFields('),app.indexOf(' function enhanceSwitch('));
  const disclosureLayout=app.slice(app.lastIndexOf(" MaterialRuntime.registerLayout("),app.indexOf(" MaterialRuntime.start(document.body);"));
  const cleanup=app.match(/cleanup\(root\)\{MaterialRuntime.cleanup\(root,switches,"input"\);MaterialRuntime.cleanup\(root,disclosures,"#ml-appearance-entry"\);\}/)[0];
  await page.addScriptTag({content:'(function(){const t=(a,b)=>b,disclosures=new Map(),switches=new Map();const node=(tag,attrs={},children=[])=>{const n=document.createElement(tag);for(const [k,v]of Object.entries(attrs)){if(k==="text")n.textContent=v;else n.setAttribute(k,v);}n.append(...children);return n;};const openAppearance=details=>{if(!details.querySelector("#ml-appearance")){const n=document.createElement("section");n.id="ml-appearance";details.append(n);}};'+entry+'window.makeAppearance=appearanceEntry;MaterialRuntime.register({selector:"select",enhance:appearanceEntry,'+cleanup+'});'+disclosureLayout+'appearanceEntry(maincontent);})();'});
  assert.equal(await page.evaluate(()=>mediaAdds-mediaRemoves),1);
  await page.evaluate(()=>{const n=document.getElementById("ml-appearance-entry");maincontent.append(n);});
  await page.waitForTimeout(30);
  assert.equal(await page.evaluate(()=>mediaAdds-mediaRemoves),1,"connected move retains listener");
  await page.evaluate(()=>{dispatchEvent(new PageTransitionEvent("pagehide",{persisted:true}));dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true}));});
  assert.equal(await page.evaluate(()=>mediaAdds-mediaRemoves),1);
  await page.evaluate(()=>document.getElementById("ml-appearance-entry").remove());
  await page.waitForFunction(()=>mediaAdds===mediaRemoves);
  await page.evaluate(()=>{makeAppearance(maincontent);makeAppearance(maincontent);});
  assert.equal(await page.evaluate(()=>mediaAdds-mediaRemoves),1);
  await page.setViewportSize({width:1200,height:800});
  await page.waitForFunction(()=>document.getElementById("ml-appearance-entry").open);
  await page.evaluate(()=>document.getElementById("ml-appearance-entry").remove());
  await page.waitForFunction(()=>mediaAdds===mediaRemoves);

  await page.evaluate(()=>{
   window.matchMedia=query=>{const m=realMatchMedia(query);return {get matches(){return m.matches;},addListener(fn){mediaAdds++;mediaCallbacks.add(fn);m.addListener(fn);},removeListener(fn){mediaRemoves++;mediaCallbacks.delete(fn);m.removeListener(fn);}};};
   makeAppearance(maincontent);
  });
  assert.equal(await page.evaluate(()=>mediaAdds-mediaRemoves),1);
  await page.evaluate(()=>document.getElementById("ml-appearance-entry").remove());
  await page.waitForFunction(()=>mediaAdds===mediaRemoves);
  assert.deepEqual(errors.sort(),["unrelated-fixture","view-failure-fixture"].sort());
  // A live native select legitimately owns one more list ripple at this
  // point. Permanent unload must destroy it and any still-open temporary menu.
  // A legitimate late resize may dismiss a menu between separate browser
  // tasks. Keep opening + permanent unload in one task and assert it was live.
  const openAtUnload=await page.evaluate(()=>{window.menu=MaterialExtras.menu(anchor,[["a","A"],["b","B"]],"a",()=>{});const open=menu.open;dispatchEvent(new PageTransitionEvent("pagehide",{persisted:false}));return open;});
  assert.equal(openAtUnload,true);
  assert.equal(await page.locator(".ml-action-menu").count(),0);
  assert.equal(await page.evaluate(()=>rippleCreated),await page.evaluate(()=>rippleDestroyed));
  results.push({design,temporaryBalance,status:"passed",pollUnchangedWrites:writes.length,manualRippleBalance:await page.evaluate(()=>({created:rippleCreated,destroyed:rippleDestroyed}))});
  await page.close();
 }
}finally{await browser.close();fs.mkdirSync("dist/ui-refinement",{recursive:true});fs.writeFileSync("dist/ui-refinement/followup.json",JSON.stringify(results,null,2));}
console.log(JSON.stringify(results));
