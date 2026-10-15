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
 });
 const buttons=actions==="right"
  ?'<div class="right"><button class="btn cbi-button" data-action="close">Close</button><button class="btn cbi-button cbi-button-positive important" data-action="apply">Save &amp; Apply</button><button class="btn cbi-button-reset" data-action="undo">Revert</button></div>'
  :'<div class="button-row"><button class="btn cbi-button" data-action="close">Close</button><div class="cbi-combo-button"><button class="btn cbi-button cbi-button-positive important" data-action="apply">Save &amp; Apply</button><button class="btn cbi-button" data-action="menu" aria-label="More apply options">▾</button><div class="dropdown" hidden>Apply unchecked</div></div><button class="btn cbi-button-reset" data-action="undo">Revert</button></div>';
 const groups=count>4?'<h5>/etc/config/network</h5>'+rows.slice(0,4).join("")+'<h5>/etc/config/dhcp</h5>'+rows.slice(4).join(""):'<h5>/etc/config/network</h5>'+rows.join("");
 return '<div id="modal_overlay"><div class="modal uci-dialog" role="dialog"><h4>Configuration / Changes</h4><div class="cbi-section"><strong>Legend:</strong><div class="uci-change-legend"><div class="uci-change-legend-label"><ins>&nbsp;</ins> Section added</div><div class="uci-change-legend-label"><del>&nbsp;</del> Section removed</div><div class="uci-change-legend-label"><var><ins>&nbsp;</ins></var> Option changed</div><div class="uci-change-legend-label"><var><del>&nbsp;</del></var> Option removed</div></div><br><div class="uci-change-list">'+groups+'</div><br>'+buttons+'</div></div></div>';
}
try{
 for(const design of ["classic","m3e"])for(const theme of ["light","dark"])for(const width of [1280,390])for(const count of [0,1,2,60]){
  const actions=count===2?"right":"button-row",page=await browser.newPage({viewport:{width,height:width===390?844:900},deviceScaleFactor:1});
  await page.setContent('<html lang="en"><body class="modal-overlay-active"><main id="maincontent"><div id="view"></div></main>'+markup(count,actions)+'</body></html>');
  for(const file of ["mdc-linear-progress.css","cascade.css","design-m3.css"])await page.addStyleTag({path:base+file});
  for(const file of ["palette.js","palette-m3.js"])await page.addScriptTag({path:base+file});
  await page.evaluate(({design,theme})=>{
   const root=document.documentElement;root.dataset.design=design;root.dataset.theme=theme;root.dataset.cards="true";
   for(const [k,v] of Object.entries({"--ml-vv-top":"0px","--ml-vv-left":"0px","--ml-vv-width":"100vw","--ml-vv-height":"100dvh"}))root.style.setProperty(k,v);
   window.MaterialAppearance={activeDesign:design};
   const dark=theme==="dark",m3=design==="m3e"?MaterialM3Palette.generate("#009688",dark):null,p=m3?m3.legacy:MaterialPalette.generate("#009688",dark);
   if(m3){for(const [k,v] of Object.entries(m3.system))root.style.setProperty("--md-sys-color-"+k.replace(/[A-Z]/g,c=>"-"+c.toLowerCase()),v);for(const [k,v] of Object.entries(m3.surfaces))root.style.setProperty("--"+k,v);}
   const map={accentInk:"accent-ink",controlAccent:"control-accent",controlStrong:"control-strong",actionPrimary:"action-fill",onActionPrimary:"on-accent",actionPrimaryPressed:"action-pressed",actionSecondary:"action-tonal",onActionSecondary:"on-action-tonal",actionSecondaryPressed:"tonal-pressed"};
   for(const [k,v] of Object.entries(map))root.style.setProperty("--"+v,p[k]);
   window.actionCounts={close:0,undo:0,apply:0,menu:0};
   document.querySelectorAll("[data-action]").forEach(b=>b.addEventListener("click",()=>{const key=b.dataset.action;actionCounts[key]++;if(key==="menu")b.parentElement.querySelector(".dropdown").hidden=false;if(key==="close")document.body.classList.remove("modal-overlay-active");}));
  },{design,theme});
  for(const file of ["material-web.js","mdc-linear-progress.js","mdc-controls.js","runtime.js","components.js","surfaces.js","feedback.js","wait.js","controls.js"])await page.addScriptTag({path:base+file});
  await page.evaluate(()=>MaterialRuntime.start(document.body));
  await page.waitForFunction(()=>document.querySelector(".modal")?.classList.contains("ml-changes-dialog"));
  const secondary=page.locator('[data-action="undo"]');
  const geometry=await secondary.evaluate(n=>{
   const s=getComputedStyle(n),r=n.getBoundingClientRect(),label=n.querySelector(".mdc-button__label")||[...n.childNodes].find(c=>c.nodeType===3&&c.textContent.trim());
   const range=document.createRange();range.selectNodeContents(label);const l=range.getBoundingClientRect();
   return {bg:s.backgroundColor,border:s.borderTopWidth,shadow:s.boxShadow,token:s.getPropertyValue("--button-bg").trim(),height:r.height,centerError:Math.abs((l.top+l.bottom-r.top-r.bottom)/2)};
  });
  assert.equal(geometry.bg,"rgba(0, 0, 0, 0)",JSON.stringify(geometry));
  assert.equal(geometry.token,"transparent");assert.equal(geometry.border,"0px");assert.equal(geometry.shadow,"none");
  assert.ok(geometry.height>=48&&geometry.centerError<3,JSON.stringify(geometry));
  await secondary.hover();await page.screenshot({path:"dist/ui-refinement/changes-dialog/hover-"+design+"-"+theme+"-"+width+"-"+count+".png"});
  await page.mouse.down();await page.screenshot({path:"dist/ui-refinement/changes-dialog/pressed-"+design+"-"+theme+"-"+width+"-"+count+".png"});await page.mouse.move(0,0);await page.mouse.up();await page.waitForTimeout(350);
  const layout=await page.evaluate(()=>{const p=document.querySelector(".modal"),title=p.querySelector(":scope > h4"),a=p.querySelector(".right,.button-row"),apply=a.querySelector("button.cbi-button-positive.important");return {w:p.getBoundingClientRect().width,h:p.getBoundingClientRect().height,vw:innerWidth,vh:innerHeight,ch:p.clientHeight,sh:p.scrollHeight,overflowX:p.scrollWidth>p.clientWidth,order:[...a.children].map(n=>n.dataset.action||n.className),font:getComputedStyle(title).fontSize,applyParent:apply.parentElement.className};});
  assert.equal(await page.evaluate(()=>{
   const p=document.querySelector(".modal"),h=p.querySelector(":scope > h4"),a=p.querySelector(".right,.button-row");
   return getComputedStyle(p).backgroundColor===getComputedStyle(h).backgroundColor&&getComputedStyle(p).backgroundColor===getComputedStyle(a).backgroundColor;
  }),true,"title, body and action surfaces match");
  assert.equal(layout.overflowX,false,design+" "+theme+" "+width+"px horizontal overflow");
  assert.deepEqual(layout.order.map(item=>item==="cbi-combo-button"?"apply":item),["close","undo","apply"],"visual and keyboard action order");
  assert.ok(layout.w<=Math.min(560,layout.vw-32)+1,JSON.stringify(layout));
  if(count===60){assert.ok(layout.sh>layout.ch,"large summaries must scroll");await page.evaluate(()=>document.querySelector(".modal").scrollTop=99999);const sticky=await page.evaluate(()=>({top:document.querySelector(".modal>h4").getBoundingClientRect().top,bottom:document.querySelector(".modal .right,.modal .button-row").getBoundingClientRect().bottom,vh:innerHeight}));assert.ok(sticky.top>=-1&&sticky.top<100,JSON.stringify(sticky));assert.ok(sticky.bottom<=sticky.vh+1,JSON.stringify(sticky));
   assert.equal(await page.evaluate(()=>{const p=document.querySelector(".modal"),h=p.querySelector(":scope > h4"),r=p.getBoundingClientRect(),hr=h.getBoundingClientRect();return Math.abs(hr.top-r.top)<2&&h.contains(document.elementFromPoint(r.x+r.width/2,r.y+4));}),true,"sticky title covers the surface top without leaking command rows");}
  await page.screenshot({path:"dist/ui-refinement/changes-dialog/"+design+"-"+theme+"-"+width+"px-"+count+".png"});
  if(count===2||count===60){
   if(actions==="button-row"&&count===60)await page.locator('[data-action="menu"]').click();
   await page.locator('[data-action="undo"]').click();await page.locator('[data-action="apply"]').click();
   assert.deepEqual(await page.evaluate(()=>actionCounts),{close:0,undo:1,apply:1,menu:actions==="button-row"?1:0});
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
