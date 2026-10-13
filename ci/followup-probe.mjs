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
  results.push({design,before,after,observer,tables});
  await page.close();
 }
}finally{await browser.close();fs.mkdirSync("dist/ui-refinement",{recursive:true});fs.writeFileSync("dist/ui-refinement/probe.json",JSON.stringify(results,null,2));}
console.log(JSON.stringify(results));
