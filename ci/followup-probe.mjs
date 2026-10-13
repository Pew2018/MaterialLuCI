import {chromium} from "playwright";
import fs from "node:fs";
const base="build/stage/www/luci-static/materialluci/";
const browser=await chromium.launch(),results=[];
try{
 for(const design of ["classic","m3e"]){
  const page=await browser.newPage({viewport:{width:390,height:800}});
  await page.setContent('<html lang="en"><body><main id="maincontent"><div id="view"><section class="cbi-section"><div class="cbi-value"><label class="cbi-value-title">Field</label><div class="cbi-value-field"><input id="field" type="text" value="value"></div></div><p id="below">Body</p></section><table id="simple"><tr><th>Name</th><th>State</th><th>Action</th></tr><tr><td>LAN</td><td>Up</td><td><button>View</button></td></tr></table><table id="wide"><tr><th>Name</th><th>IPv6 address</th><th>RX</th><th>TX</th><th>Actions</th></tr><tr><td>WAN</td><td class="nowrap">2001:db8:abcd:1234::1234/64</td><td>12345678 bytes</td><td>12345678 bytes</td><td><button>Restart interface</button></td></tr></table></div></main><div id="modal_overlay"><div class="modal"><h4>Title</h4><input></div></div></body></html>');
  await page.evaluate(design=>{document.documentElement.dataset.design=design;document.documentElement.dataset.cards="true";window.MaterialAppearance={activeDesign:design};window.probe={callbacks:0,records:0,syncs:0};},design);
  for(const f of ["mdc-linear-progress.css","cascade.css","design-m3.css"])await page.addStyleTag({path:base+f});
  for(const f of ["material-web.js","mdc-controls.js","mdc-textfield.js","runtime.js","components.js","surfaces.js"])await page.addScriptTag({path:base+f});
  let controls=fs.readFileSync("theme/root/www/luci-static/materialluci/controls.js","utf8");
  controls=controls.replace("function syncLuCI(){","function syncLuCI(){probe.syncs++;").replace("const modalObserver=new MutationObserver(records=>{","const modalObserver=new MutationObserver(records=>{probe.callbacks++;probe.records+=records.length;");
  await page.addScriptTag({content:controls});
  await page.evaluate(()=>{MaterialSurfaces.prepare();});
  const before=await page.evaluate(()=>({height:field.getBoundingClientRect().height,below:below.getBoundingClientRect().top,scroll:scrollY,focus:document.activeElement.id}));
  await page.addScriptTag({path:base+"textfield.js"});
  await page.evaluate(()=>MaterialTextFields.enhance(document.getElementById("field")));
  const after=await page.evaluate(()=>({height:field.getBoundingClientRect().height,below:below.getBoundingClientRect().top,scroll:scrollY,focus:document.activeElement.id}));
  await page.evaluate(()=>{probe.callbacks=0;probe.records=0;probe.syncs=0;});
  for(let i=0;i<20;i++)await page.evaluate(i=>{field.classList.toggle("probe-active");below.textContent=String(i);},i);
  const observer=await page.evaluate(()=>({...probe}));
  const tables=await page.evaluate(()=>Object.fromEntries(["simple","wide"].map(id=>{const n=document.getElementById(id),h=n.parentElement;return [id,{table:n.getBoundingClientRect().width,host:h.clientWidth,scroll:h.scrollWidth}];})));

  const focus=await page.evaluate(()=>{
   const n=document.createElement("input");n.type="password";n.id="focused-probe";const parent=document.createElement("div");parent.className="cbi-value-field";parent.append(n);document.getElementById("view").append(parent);n.focus();
   const height=n.getBoundingClientRect().height,scroll=scrollY,start=performance.now();MaterialTextFields.enhance(n);
   return {before:height,after:n.getBoundingClientRect().height,retained:document.activeElement===n,scrollBefore:scroll,scrollAfter:scrollY,constructorMs:performance.now()-start,deferred:!n.closest(".ml-text-field")};
  });
  await page.evaluate(()=>{
   const view=document.getElementById("view");
   const fields=document.createElement("table");fields.id="fields";fields.className="cbi-section-table";fields.innerHTML='<tr><th>Option</th><th>Value</th><th>Action</th></tr><tr><td>DNS</td><td><input type="text" value="2001:db8::1"></td><td><button>Save</button></td></tr>';
   const chain=document.createElement("div");chain.setAttribute("data-chain","input");chain.id="chain";chain.innerHTML='<h3>INPUT</h3><table id="firewall"><tr><th>Packets</th><th>Bytes</th><th>Target</th><th>Protocol</th><th>Source</th><th>Destination</th></tr><tr><td>123</td><td>456</td><td>ACCEPT</td><td>tcp</td><td class="nowrap">2001:db8:1234::1/64</td><td>anywhere</td></tr></table>';
   view.append(fields,chain);MaterialSurfaces.prepare();MaterialRuntime.start(document.body);
  });
  const additionalTables=await page.evaluate(()=>({fields:{width:document.getElementById("fields").getBoundingClientRect().width,host:document.getElementById("fields").parentElement.clientWidth},firewall:{parent:document.getElementById("firewall").parentElement.id,adjacent:document.querySelector("#chain h3").nextElementSibling.id,width:document.getElementById("firewall").getBoundingClientRect().width,host:chain.clientWidth},pageWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
  await page.evaluate(()=>{probe.syncs=0;document.body.classList.add("modal-overlay-active");});
  await page.waitForFunction(()=>MaterialControls.count().dialogs===1);
  await page.evaluate(()=>document.querySelector("#modal_overlay>.modal").innerHTML='<h4 id="probe-title">New title</h4><input>');
  await page.waitForFunction(()=>document.querySelector("#modal_overlay>.modal").getAttribute("aria-labelledby")==="probe-title");
  const modal=await page.evaluate(()=>({...probe}));
  results.push({design,before,after,observer,tables,focus,additionalTables,modal});

  await page.close();
 }
}finally{await browser.close();fs.mkdirSync("dist/ui-refinement",{recursive:true});fs.writeFileSync("dist/ui-refinement/probe.json",JSON.stringify(results,null,2));}
console.log(JSON.stringify(results));
