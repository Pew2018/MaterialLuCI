import {chromium} from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
const base="build/stage/www/luci-static/materialluci/";
fs.mkdirSync("dist/ui-refinement/changes-dialog",{recursive:true});
const browser=await chromium.launch(),results=[];
function markup(count,actions){
 const rows=Array.from({length:count},(_,i)=>{
  if(i===0)return '<ins>uci add network <strong>interface</strong></ins>';
  if(i===1)return '<var><ins>uci set network.lan.proto=<strong>\'dhcp\'</strong></ins></var>';
  if(i===2)return '<var><del>uci del_list firewall.@zone[0].network=<strong>\'guest\'</strong></del></var>';
  if(i===3)return '<del>uci del network.wan</del>';
  return '<var><ins>uci set dhcp.host.'+i+'.name=<strong>\'设备名称 '+i+' with a deliberately long value for wrapping\'</strong></ins></var>';
 }).join("");
 const buttons=actions==="right"
  ?'<div class="right"><button class="btn cbi-button" data-action="close">Close</button><button class="btn cbi-button cbi-button-positive important" data-action="apply">Save &amp; Apply</button><button class="btn cbi-button-reset" data-action="undo">Revert</button></div>'
  :'<div class="button-row"><button class="btn cbi-button" data-action="close">Close</button><div class="cbi-combo-button"><button class="btn cbi-button cbi-button-positive important" data-action="apply">Save &amp; Apply</button><button class="btn cbi-button" data-action="menu" aria-label="More apply options">▾</button><div class="dropdown" hidden>Apply unchecked</div></div><button class="btn cbi-button-reset" data-action="undo">Revert</button></div>';
 return '<div id="modal_overlay"><div class="modal uci-dialog" role="dialog"><h4>Configuration / Changes</h4><div class="cbi-section"><strong>Legend:</strong><div class="uci-change-legend"><div class="uci-change-legend-label"><ins>&nbsp;</ins> Section added</div><div class="uci-change-legend-label"><del>&nbsp;</del> Section removed</div><div class="uci-change-legend-label"><var><ins>&nbsp;</ins></var> Option changed</div><div class="uci-change-legend-label"><var><del>&nbsp;</del></var> Option removed</div></div><br><div class="uci-change-list"><h5>/etc/config/network</h5>'+rows+'</div><br>'+buttons+'</div></div></div>';
}
try{
 for(const design of ["classic","m3e"])for(const theme of ["light","dark"])for(const width of [1280,390])for(const count of [2,60]){
  const actions=count===2?"right":"button-row",page=await browser.newPage({viewport:{width,height:width===390?844:900},deviceScaleFactor:1});
  await page.setContent('<html lang="en"><body class="modal-overlay-active"><main id="maincontent"><div id="view"></div></main>'+markup(count,actions)+'</body></html>');
  for(const file of ["mdc-linear-progress.css","cascade.css","design-m3.css"])await page.addStyleTag({path:base+file});
  for(const file of ["palette.js","palette-m3.js"])await page.addScriptTag({path:base+file});
  await page.evaluate(({design,theme})=>{
   const root=document.documentElement;root.dataset.design=design;root.dataset.theme=theme;root.dataset.cards="true";
   for(const [k,v] of Object.entries({"--ml-vv-top":"0px","--ml-vv-left":"0px","--ml-vv-width":"100vw","--ml-vv-height":"100dvh"}))root.style.setProperty(k,v);
   window.MaterialAppearance={activeDesign:design};
   const dark=theme==="dark",m3=design==="m3e"?MaterialM3Palette.generate("#42A5F5",dark):null,p=m3?m3.legacy:MaterialPalette.generate("#42A5F5",dark);
   if(m3){for(const [k,v] of Object.entries(m3.system))root.style.setProperty("--md-sys-color-"+k.replace(/[A-Z]/g,c=>"-"+c.toLowerCase()),v);for(const [k,v] of Object.entries(m3.surfaces))root.style.setProperty("--"+k,v);}
   const map={accentInk:"accent-ink",controlAccent:"control-accent",controlStrong:"control-strong",actionPrimary:"action-fill",onActionPrimary:"on-accent",actionPrimaryPressed:"action-pressed",actionSecondary:"action-tonal",onActionSecondary:"on-action-tonal",actionSecondaryPressed:"tonal-pressed"};
   for(const [k,v] of Object.entries(map))root.style.setProperty("--"+v,p[k]);
   window.actionCounts={close:0,undo:0,apply:0,menu:0};
   document.querySelectorAll("[data-action]").forEach(b=>b.addEventListener("click",()=>{const key=b.dataset.action;actionCounts[key]++;if(key==="menu")b.parentElement.querySelector(".dropdown").hidden=false;if(key==="close")document.body.classList.remove("modal-overlay-active");}));
  },{design,theme});
  for(const file of ["material-web.js","mdc-linear-progress.js","mdc-controls.js","runtime.js","components.js","surfaces.js","feedback.js","wait.js","controls.js"])await page.addScriptTag({path:base+file});
  await page.evaluate(()=>MaterialRuntime.start(document.body));
  await page.waitForFunction(()=>document.querySelector(".modal")?.classList.contains("ml-changes-dialog"));
  const layout=await page.evaluate(()=>{const p=document.querySelector(".modal"),title=p.querySelector(":scope > h4"),a=p.querySelector(".right,.button-row"),apply=a.querySelector("button.cbi-button-positive.important");return {w:p.getBoundingClientRect().width,h:p.getBoundingClientRect().height,vw:innerWidth,vh:innerHeight,ch:p.clientHeight,sh:p.scrollHeight,overflowX:p.scrollWidth>p.clientWidth,order:[...a.children].map(n=>n.dataset.action||n.className),font:getComputedStyle(title).fontSize,applyParent:apply.parentElement.className};});
  assert.equal(layout.overflowX,false,design+" "+theme+" "+width+"px horizontal overflow");
  assert.ok(layout.w<=Math.min(560,layout.vw-32)+1,JSON.stringify(layout));
  if(count===60){assert.ok(layout.sh>layout.ch,"large summaries must scroll");await page.evaluate(()=>document.querySelector(".modal").scrollTop=99999);const sticky=await page.evaluate(()=>({top:document.querySelector(".modal>h4").getBoundingClientRect().top,bottom:document.querySelector(".modal .right,.modal .button-row").getBoundingClientRect().bottom,vh:innerHeight}));assert.ok(sticky.top>=-1&&sticky.top<100,JSON.stringify(sticky));assert.ok(sticky.bottom<=sticky.vh+1,JSON.stringify(sticky));}
  await page.screenshot({path:"dist/ui-refinement/changes-dialog/"+design+"-"+theme+"-"+width+"px-"+count+".png"});
  if(count===60&&actions==="button-row"){
   await page.locator('[data-action="menu"]').click();await page.locator('[data-action="undo"]').click();await page.locator('[data-action="apply"]').click();
   assert.deepEqual(await page.evaluate(()=>actionCounts),{close:0,undo:1,apply:1,menu:1});
   await page.locator('[data-action="close"]').click();await page.waitForFunction(()=>!document.querySelector(".modal").classList.contains("ml-changes-dialog"));
   await page.evaluate(()=>{document.querySelector(".modal").innerHTML='<h4>System</h4><div class="cbi-section"><p>Ordinary dialog</p></div>';document.body.classList.add("modal-overlay-active");});
   await page.waitForFunction(()=>document.querySelector("#modal_overlay").classList.contains("mdc-dialog--open"));
   assert.equal(await page.locator(".modal.ml-changes-dialog").count(),0);assert.equal(await page.locator("#modal_overlay.ml-changes-overlay").count(),0);
   await page.evaluate(()=>document.body.classList.remove("modal-overlay-active"));
  }
  results.push({design,theme,width,count,actions,panelWidth:layout.w,panelHeight:layout.h,scrolls:count===60});await page.close();
 }
}finally{await browser.close();fs.writeFileSync("dist/ui-refinement/changes-dialog/results.json",JSON.stringify(results,null,2));}
console.log(JSON.stringify(results));
