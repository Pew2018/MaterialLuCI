import {chromium,webkit} from "playwright";
import {spawn} from "node:child_process";
import fs from "node:fs";
import assert from "node:assert/strict";
const server=spawn("python3",["ci/server.py"],{stdio:"inherit"}),origin="http://127.0.0.1:8765",out="dist/scroll-behavior",results=[];
fs.mkdirSync(out,{recursive:true});
for(let i=0;i<100;i++){try{await fetch(origin);break;}catch{await new Promise(r=>setTimeout(r,50));}}
try{for(const [engine,type]of [["chromium",chromium],["webkit",webkit]].filter(([n])=>n===(process.env.ENGINE||"chromium"))){
 const browser=await type.launch({headless:false});
 try{for(const design of ["classic","m3e"])for(const theme of ["light","dark"])for(const width of [1280,390]){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.addInitScript(c=>{localStorage.setItem("materialluci-design",c.design);localStorage.setItem("materialluci-mode",c.theme);localStorage.setItem("materialluci-cards","true");},{design,theme});
  await page.goto(origin+"/upstream.html");await page.waitForSelector("#ml-appearance-entry");
  await page.evaluate(async()=>{
   const poll=await L.require("poll");poll.stop();
   const form=await L.require("form"),m=new form.JSONMap({settings:{enabled:"1",host:"router"}},"Native gesture regression"),s=m.section(form.NamedSection,"settings","settings");
   s.option(form.Flag,"enabled","Enabled");const b=s.option(form.Button,"action","Action");b.inputtitle="Action";b.onclick=()=>window.actionCalls++;
   for(let i=0;i<35;i++)s.option(form.Value,"host"+i,"Host "+i);
   view.append(await m.render());window.actionCalls=0;window.controlClicks=0;view.addEventListener("click",()=>controlClicks++);
  });
  await page.waitForTimeout(800);
  const baseline=await page.evaluate(()=>({checked:[...view.querySelectorAll("input[type=checkbox]")].map(n=>n.checked),calls:actionCalls}));
  const gestures=[];
  for(const target of ["blank","button","switch"]){
   const locator=target==="button"?page.locator("#view button.cbi-button").last():target==="switch"?page.locator("#view .ml-switch-hit").last():page.locator("#view .cbi-map").last();
   await locator.scrollIntoViewIfNeeded();const rect=await locator.boundingBox();
   let x=target==="blank"?(width<600?8:264):Math.min(width-10,rect.x+rect.width/2),y=target==="blank"?350:Math.min(700,Math.max(120,rect.y+rect.height/2));
   await page.mouse.move(x,y);const top=await page.evaluate(()=>scrollY);const positions=[];
   for(let i=0;i<12;i++){await page.mouse.wheel(0,i<6?110:-110);await page.waitForTimeout(60);positions.push(await page.evaluate(()=>scrollY));}
   await page.waitForTimeout(350);
   assert.ok(Math.max(...positions)-Math.min(...positions)>100,engine+" "+target+" wheel did not move");
   assert.deepEqual(await page.evaluate(()=>({checked:[...view.querySelectorAll("input[type=checkbox]")].map(n=>n.checked),calls:actionCalls})),baseline);
   assert.equal(await page.evaluate(()=>controlClicks),0,"scroll must not synthesize click");
   assert.equal(await page.locator(".mdc-ripple-upgraded--foreground-activation").count(),0);
   gestures.push({target,top,positions});
  }
  await page.evaluate(async()=>{const ui=await L.require("ui"),host=E("div",{id:"gesture-dropdown"},(window.gestureDropdownWidget=new ui.Dropdown("wan",{wan:"WAN",lan:"LAN",other:"Other"},{optional:true})).render());view.prepend(host);});
  await page.locator("#gesture-dropdown .open").click();await page.mouse.move(width<600?8:264,400);await page.mouse.wheel(0,180);await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>gestureDropdownWidget.getValue()),"wan","scrolling must preserve native popup selection");
  await page.mouse.click(width<600?8:264,150);
  await page.evaluate(()=>{const sidebar=document.querySelector(".ml-sidebar");for(let i=0;i<60;i++)sidebar.append(E("a",{href:"#"},"Extra menu "+i));});
  if(width<600)await page.locator("#ml-menu-button").click();
  const pageBefore=await page.evaluate(()=>scrollY);await page.mouse.move(100,400);for(let i=0;i<6;i++){await page.mouse.wheel(0,140);await page.waitForTimeout(70);}
  const sidebarTop=await page.locator(".ml-sidebar").evaluate(n=>n.scrollTop);assert.ok(sidebarTop>100);assert.equal(await page.evaluate(()=>scrollY),pageBefore);
  if(width<600)await page.locator("#ml-drawer-close").click();
  await page.evaluate(async()=>{window.uiGesture=await L.require("ui");uiGesture.showModal("Long content",Array.from({length:60},(_,i)=>E("p","Modal line "+i)));});
  await page.waitForTimeout(300);const modal=page.locator("#modal_overlay .modal"),r=await modal.boundingBox();
  const locked=await page.evaluate(()=>scrollY);await page.mouse.move(r.x+r.width/2,r.y+Math.min(r.height-40,400));
  for(let i=0;i<6;i++){await page.mouse.wheel(0,140);await page.waitForTimeout(70);}
  const modalTop=await modal.evaluate(n=>n.scrollTop);assert.ok(modalTop>100);assert.equal(await page.evaluate(()=>scrollY),locked);
  await page.evaluate(()=>uiGesture.hideModal());await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>scrollY),locked);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const id=[engine,design,theme,width].join("-");await page.evaluate(()=>scrollTo(0,0));await page.mouse.move(0,0);await page.screenshot({path:out+"/"+id+".png",fullPage:true});
  assert.deepEqual(errors,[]);results.push({engine,design,theme,width,gestures,sidebarTop,modalTop,errors});fs.writeFileSync(out+"/results.json",JSON.stringify(results,null,2));
  console.log(id+" native wheel, controls, sidebar, modal and position passed");await page.close();
 }}finally{await browser.close();}
}}finally{server.kill();fs.writeFileSync(out+"/results.json",JSON.stringify(results,null,2));}
