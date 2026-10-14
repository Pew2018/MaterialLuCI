import {chromium,webkit} from "playwright";
import {spawn} from "node:child_process";
import fs from "node:fs";
import assert from "node:assert/strict";
const server=spawn("python3",["ci/server.py"],{stdio:"inherit"}),origin="http://127.0.0.1:8765",results=[];
const out="dist/ui-refinement/native-changes";fs.mkdirSync(out,{recursive:true});
for(let i=0;i<100;i++){try{await fetch(origin);break;}catch{await new Promise(r=>setTimeout(r,50));}}
try{for(const [engine,type]of [["chromium",chromium],["webkit",webkit]]){
 const browser=await type.launch();
 try{for(const design of ["classic","m3e"]){
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.addInitScript(design=>{localStorage.setItem("materialluci-design",design);localStorage.setItem("materialluci-seed","#009688");},design);
  await page.goto(origin+"/upstream.html");await page.waitForSelector("#ml-appearance-entry");
  await page.evaluate(async()=>{window.uiFixture=await L.require("ui");MaterialAppearance.set("seed","#009688");window.calls={apply:0,revert:0};uiFixture.changes.apply=()=>calls.apply++;uiFixture.changes.revert=()=>calls.revert++;});
  for(const theme of ["light","dark"])for(const width of [1280,390,320])for(const count of [0,1,2,60]){
   await page.setViewportSize({width,height:width<600?844:900});
   await page.evaluate(({theme,count})=>{MaterialAppearance.set("mode",theme);uiFixture.changes.changes={system:Array.from({length:count},(_,i)=>["set","ntp","server"+i,"0.pool.ntp.org "+i+" long value"])};
    if(count>2)uiFixture.changes.changes.network=[["set","lan","proto","static"]];uiFixture.changes.displayChanges();},{theme,count});
   await page.waitForFunction(()=>document.querySelector(".ml-changes-dialog"));
   const buttons=page.locator(".ml-changes-dialog .right>button");
   await buttons.last().scrollIntoViewIfNeeded();
   await page.mouse.move(0,0);await page.waitForTimeout(350);
   const styles=await buttons.evaluateAll(ns=>ns.map(n=>{
    const s=getComputedStyle(n),r=n.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(n.querySelector(".mdc-button__label")||n);const l=range.getBoundingClientRect();
    return {classes:n.className,bg:s.backgroundColor,border:s.borderTopWidth,shadow:s.boxShadow,token:s.getPropertyValue("--button-bg").trim(),height:r.height,center:Math.abs((l.top+l.bottom-r.top-r.bottom)/2),text:n.textContent.trim()};
   }));
   assert.equal(styles.length,3);assert.ok(styles[1].classes.includes("cbi-button-reset"));assert.ok(styles[2].classes.includes("cbi-button-positive"));
   for(const s of styles.slice(0,2)){assert.equal(s.bg,"rgba(0, 0, 0, 0)",JSON.stringify(s));assert.equal(s.token,"transparent");assert.equal(s.border,"0px");assert.equal(s.shadow,"none");assert.ok(s.height>=48&&s.center<3,JSON.stringify(s));}
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const id=[engine,design,theme,width,count].join("-");
   await page.screenshot({path:out+"/"+id+".png"});
   if(count===1){
    const undo=buttons.nth(1);await undo.focus();assert.notEqual(await undo.evaluate(n=>getComputedStyle(n).outlineStyle),"none");
    await undo.evaluate(n=>n.disabled=true);
    assert.equal(await undo.evaluate(n=>getComputedStyle(n).backgroundColor),"rgba(0, 0, 0, 0)");
    await undo.evaluate(n=>n.disabled=false);
    await undo.hover();await page.screenshot({path:out+"/"+id+"-hover.png"});
    await page.mouse.down();await page.screenshot({path:out+"/"+id+"-pressed.png"});await page.mouse.move(0,0);await page.mouse.up();await page.waitForTimeout(350);
   }
   await page.evaluate(()=>calls={apply:0,revert:0});
   await buttons.nth(1).click();await buttons.last().click();assert.deepEqual(await page.evaluate(()=>calls),{apply:1,revert:1});
   const scroll=await page.evaluate(()=>scrollY);await buttons.first().click();await page.waitForFunction(()=>!document.body.classList.contains("modal-overlay-active"));assert.equal(await page.evaluate(()=>scrollY),scroll);
   await page.evaluate(()=>uiFixture.showModal("Ordinary edit",[E("p","Settings"),E("div",{class:"right"},E("button",{class:"cbi-button cbi-button-reset"},"Restore"))]));
   await page.waitForFunction(()=>!document.querySelector(".ml-changes-dialog"));assert.equal(await page.locator(".ml-changes-overlay").count(),0);
   await page.evaluate(()=>uiFixture.hideModal());results.push({engine,design,theme,width,count,styles});
  }
  await page.close();
 }}finally{await browser.close();}
}}finally{server.kill();fs.writeFileSync(out+"/results.json",JSON.stringify(results,null,2));}
console.log("Pinned native 21.02 displayChanges: "+results.length+" geometry/state/lifecycle cases passed; RPC apply/revert are fixture callbacks.");
