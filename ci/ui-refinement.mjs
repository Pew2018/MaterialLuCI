import {chromium} from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
const base="build/stage/www/luci-static/materialluci/";
fs.mkdirSync("dist/ui-refinement",{recursive:true});
const browser=await chromium.launch();
const results=[];
try{
 for(const design of ["classic","m3e"]){
  const page=await browser.newPage({viewport:{width:900,height:800}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.setContent('<html lang="en"><body><main id="maincontent" class="container" data-ml-page="system"><div id="view"><p class="spinning">Loading view</p></div></main><div id="modal_overlay"><div class="modal"><p class="spinning">Working</p></div></div></body></html>');
  for(const file of ["mdc-linear-progress.css","cascade.css","design-m3.css"])await page.addStyleTag({path:base+file});
  await page.evaluate(design=>{
   document.documentElement.dataset.design=design;document.documentElement.dataset.cards="true";
   window.MaterialAppearance={activeDesign:design};
   // Palette is a representative fixture; business data and router RPC are absent.
   const s=document.documentElement.style;
   for(const [k,v] of Object.entries({"primary":"#6750a4","primary-container":"#eaddff","surface-container-highest":"#e6e0e9"}))s.setProperty("--md-sys-color-"+k,v);
  },design);
  for(const file of ["palette-m3.js","palette.js","material-web.js","mdc-linear-progress.js","mdc-controls.js","runtime.js","components.js","surfaces.js","feedback.js","wait.js"])await page.addScriptTag({path:base+file});
  await page.evaluate(()=>{
   window.fixtureAppearance=(theme,cards)=>{
    const root=document.documentElement,dark=theme==="dark",m3=MaterialAppearance.activeDesign==="m3e"?MaterialM3Palette.generate("#42A5F5",dark):null,p=m3?m3.legacy:MaterialPalette.generate("#42A5F5",dark);
    if(m3){for(const [k,v] of Object.entries(m3.system))root.style.setProperty("--md-sys-color-"+k.replace(/[A-Z]/g,c=>"-"+c.toLowerCase()),v);for(const [k,v] of Object.entries(m3.surfaces))root.style.setProperty("--"+k,v);}
    const mapping={accentInk:"accent-ink",controlAccent:"control-accent",controlStrong:"control-strong",actionPrimary:"action-fill",onActionPrimary:"on-accent",actionPrimaryPressed:"action-pressed",actionSecondary:"action-tonal",onActionSecondary:"on-action-tonal",actionSecondaryPressed:"tonal-pressed"};
    for(const [k,v] of Object.entries(mapping))root.style.setProperty("--"+v,p[k]);
    root.dataset.theme=theme;root.dataset.cards=cards;
   };
   fixtureAppearance("light","true");MaterialRuntime.start(document.body);
  });
  await page.waitForFunction(()=>document.querySelector(".ml-view-progress [data-ml-progress-engine=mdc]"));
  assert.equal(await page.locator(".ml-view-progress").evaluate(n=>getComputedStyle(n).height),"4px");
  assert.equal(await page.locator(".ml-view-progress svg").count(),0);
  assert.equal(await page.locator(".ml-view-progress .mdc-linear-progress__secondary-bar").count(),1);
  // Check the real MDC instance, not the former progress stub.
  assert.equal(await page.locator(".ml-view-progress .ml-task-progress").evaluate(n=>n._mlComponent instanceof MaterialMDC.MDCLinearProgress),true);
  await page.evaluate(()=>{document.body.classList.add("modal-overlay-active");MaterialWait.sync();});
  const engine=design==="m3e"?"m3e":"mdc";
  await page.waitForFunction(engine=>document.querySelector("#ml-mdc-wait-progress")?.dataset.mlProgressEngine===engine,engine);
  assert.equal(await page.locator("#ml-mdc-wait-progress").evaluate(n=>getComputedStyle(n).height),design==="m3e"?"16px":"4px");
  assert.equal(await page.locator("#ml-mdc-wait-progress .ml-wavy-progress").count(),design==="m3e"?1:0);
  await page.evaluate(()=>{document.body.classList.remove("modal-overlay-active");MaterialWait.sync();});
  assert.equal(await page.locator("#ml-mdc-wait-progress").count(),0);
  await page.evaluate(()=>document.getElementById("view").innerHTML='<section id="ordinary" class="cbi-section"><h3>Ordinary</h3><p>Content</p></section>');
  await page.waitForFunction(()=>!MaterialWait.activeCount());
  assert.equal(await page.locator(".ml-view-progress").count(),0);
  assert.equal(await page.locator("#ordinary.ml-card-surface").count(),1);
  // Repeat, failure and view replacement cleanup.
  for(const mode of ["finish","failure","replace"]){
   await page.evaluate(()=>document.getElementById("view").innerHTML='<p class="spinning">Loading</p>');
   await page.waitForFunction(()=>MaterialWait.activeCount()===1);
   await page.evaluate(mode=>{
    const v=document.getElementById("view");
    if(mode==="failure"){const alert=document.createElement("div");alert.className="alert-message danger";v.replaceChildren(alert);}
    else if(mode==="replace"){const next=document.createElement("div");next.id="view";next.innerHTML="<p>New view</p>";v.replaceWith(next);}
    else v.innerHTML="<p>Done</p>";
   },mode);
   await page.waitForFunction(()=>MaterialWait.activeCount()===0);
   assert.equal(await page.locator(".ml-view-progress").count(),0);
   // A replaced loader is a completed structural lifecycle.
   await page.evaluate(()=>document.getElementById("view").innerHTML="<p>Clean</p>");
  }
  await page.evaluate(()=>{
   const v=document.getElementById("view");v.innerHTML='<p class="spinning">Loading</p>';
  });
  await page.waitForFunction(()=>MaterialWait.activeCount()===1);
  await page.evaluate(()=>{dispatchEvent(new PageTransitionEvent("pagehide",{persisted:true}));dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true}));});
  assert.equal(await page.locator(".ml-view-progress").count(),1);
  await page.evaluate(()=>document.getElementById("view").innerHTML="<p>Restored</p>");
  await page.waitForFunction(()=>MaterialWait.activeCount()===0);
  // Representative structures exercise actual CSS cascade and actual classifiers.
  await page.evaluate(()=>{
   document.getElementById("view").innerHTML='<section id="ordinary" class="cbi-section"><h3>Ordinary</h3><p>Content</p></section><div id="plot"><svg width="160" height="70"><line x2="160" y2="70"/><text>Plot</text><polyline points="0,10 160,40"/></svg></div><table id="wide"><tr><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th></tr><tr><td>a</td><td>b</td><td>c</td><td>d</td><td>e</td></tr></table><section class="cbi-section" id="nested"><div class="cbi-value"><div class="cbi-value-field"><fieldset id="inner"><h3>Nested section</h3></fieldset></div></div></section><div class="cbi-map"><div data-tab="one" data-tab-title="One" data-tab-active="true" id="tab"><h3>Tab</h3><div class="cbi-value">Field</div></div></div>';
   MaterialSurfaces.prepare();
  });
  assert.equal(await page.locator("#nested.ml-card-surface").count(),0);
  assert.equal(await page.locator("#inner.ml-card-surface").count(),1);
  assert.equal(await page.locator("#tab.ml-card-surface").count(),1);
  const radius=design==="m3e"?"16px":"2px";
  for(const theme of ["light","dark"])for(const cards of ["true","false"]){
   await page.evaluate(({theme,cards})=>fixtureAppearance(theme,cards),{theme,cards});
   for(const sel of ["#ordinary","#plot",".ml-table-scroll","#inner","#tab"]){
    const s=await page.locator(sel).evaluate(n=>{const s=getComputedStyle(n);return {radius:s.borderTopLeftRadius,bg:s.backgroundColor,shadow:s.boxShadow};});
    assert.equal(s.radius,cards==="true"?radius:"0px",sel);
    if(cards==="false"){assert.equal(s.bg,"rgba(0, 0, 0, 0)");assert.equal(s.shadow,"none");}
   }
  }
  await page.evaluate(()=>{document.documentElement.dataset.cards="true";document.getElementById("view").innerHTML="<h2>Flat view</h2><p>Body</p>";MaterialSurfaces.prepare();});
  assert.equal(await page.locator("#view").evaluate(n=>getComputedStyle(n).borderRadius),radius);
  await page.evaluate(()=>{
   document.getElementById("view").remove();const main=document.getElementById("maincontent");
   main.dataset.mlPage="reboot";main.innerHTML="<h2>Legacy flat view</h2><p>Body</p>";MaterialSurfaces.prepare();
  });
  assert.equal(await page.locator("#maincontent").evaluate(n=>getComputedStyle(n).borderRadius),radius);
  await page.evaluate(()=>{
   const main=document.getElementById("maincontent");main.dataset.mlPage="flashops";
   main.innerHTML='<section class="cbi-section"><h3>Backup</h3><p>Backup description</p><form enctype="multipart/form-data"><input type="file"><input type="submit" name="backup" value="Backup"></form><h3>Restore</h3><p>Restore description</p><form enctype="multipart/form-data"><input type="submit" name="restore" value="Restore"></form></section>';MaterialSurfaces.prepare();
  });
  for(const cards of ["true","false"]){
   await page.evaluate(cards=>document.documentElement.dataset.cards=cards,cards);
   assert.equal(await page.locator(".ml-legacy-card-start").first().evaluate(n=>getComputedStyle(n).borderTopLeftRadius),cards==="true"?radius:"0px");
   assert.equal(await page.locator(".ml-legacy-card-end").first().evaluate(n=>getComputedStyle(n).borderBottomLeftRadius),cards==="true"?radius:"0px");
   const gap=await page.evaluate(()=>{const a=document.querySelector(".ml-legacy-card-start"),b=a.nextElementSibling;return b.getBoundingClientRect().top-a.getBoundingClientRect().bottom;});
   assert.equal(gap,0,"segments must be continuous");
  }
  // Native submission/reset and disabled feedback recovery; no input reparenting.
  await page.evaluate(()=>{
   const main=document.getElementById("maincontent");main.dataset.mlPage="system";document.documentElement.dataset.cards="true";
   main.innerHTML='<div id="view"><section class="cbi-section"><h3>Buttons</h3><form id="form"><fieldset id="fieldset"><input id="value" value="original"><button id="plain" type="submit" name="act" value="save">Save</button><a class="btn" id="link" href="#native">Link</a><input id="submit" type="submit" name="act" value="Input"><input id="reset" type="reset" value="Reset"><table class="cbi-section-table"><tr><td><button id="remove" class="cbi-button cbi-button-remove" type="button">Delete</button></td></tr></table><div class="btn cbi-dropdown" id="compound" tabindex="0"><span>Apply</span><span class="open">Menu</span></div></fieldset></form></section></div>';
   window.submissions=[];document.getElementById("form").addEventListener("submit",e=>{e.preventDefault();submissions.push({id:e.submitter.id,name:e.submitter.name,value:e.submitter.value});});
   MaterialSurfaces.prepare();MaterialFeedback.bind(main);
  });
  await page.waitForFunction(()=>!!document.querySelector("#plain md-ripple,#plain .mdc-button__ripple"));
  await page.locator("#plain").click();await page.locator("#submit").click();
  assert.deepEqual(await page.evaluate(()=>submissions.map(s=>s.id)),["plain","submit"]);
  await page.locator("#value").fill("changed");await page.locator("#reset").click();
  assert.equal(await page.locator("#value").inputValue(),"original");
  assert.equal(await page.locator("#submit").evaluate(n=>n.parentElement.id),"fieldset","standalone input retains parent contract");
  assert.equal(await page.locator("#compound").evaluate(n=>n.lastElementChild.className),"open");
  if(design==="m3e"){
   for(const sel of ["#plain","#link","#submit","#reset"])assert.equal(await page.locator(sel).evaluate(n=>getComputedStyle(n).borderRadius),"24px");
   assert.ok(await page.locator("#remove").evaluate(n=>n.getBoundingClientRect().width)<112,"table deletion remains compact");
   assert.equal(await page.locator("#remove").evaluate(n=>n.getBoundingClientRect().height),36,"compact borderless rule must outrank ordinary 48px geometry");
   await page.evaluate(()=>document.getElementById("fieldset").disabled=true);
   await page.waitForFunction(()=>document.querySelector("#plain md-ripple").disabled);
   await page.evaluate(()=>document.getElementById("fieldset").disabled=false);
   await page.waitForFunction(()=>!document.querySelector("#plain md-ripple").disabled);
   await page.evaluate(()=>{const b=document.createElement("button");b.id="dynamic";b.type="button";b.textContent="Dynamic";document.getElementById("fieldset").append(b);});
   await page.waitForFunction(()=>document.querySelector("#dynamic md-ripple"));
   await page.evaluate(()=>{MaterialFeedback.bind(document.body);MaterialFeedback.bind(document.body);});
   assert.equal(await page.locator("#dynamic md-ripple").count(),1);
  }
  await page.screenshot({path:"dist/ui-refinement/"+design+"-representative.png",fullPage:true});
  await page.evaluate(()=>{dispatchEvent(new PageTransitionEvent("pagehide",{persisted:false}));});
  assert.equal(await page.locator(".ml-task-progress,#ml-mdc-wait-progress,.ml-view-progress").count(),0);
  assert.deepEqual(errors,[]);
  results.push({design,status:"passed",scope:"Representative DOM, real bundled engines and CSS; not router acceptance"});
  await page.close();
 }
}finally{await browser.close();fs.writeFileSync("dist/ui-refinement/results.json",JSON.stringify(results,null,2));}
console.log(JSON.stringify(results));
