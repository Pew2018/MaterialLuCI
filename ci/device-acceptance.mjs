import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium,webkit} from "playwright";
import {spawn} from "node:child_process";
const base="http://127.0.0.1:8765",out="dist/previews",version=process.env.LUCI_FIXTURE||"luci-fixture";
const server=spawn("python3",["ci/server.py"],{stdio:"inherit"});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const reports=[];
function audit(){
 const counts={mutations:0,callbacks:0,scans:0,scanMs:0,longTasks:[],frames:[],scrollEvents:0};
 window.acceptance=counts;
 const original=window.MutationObserver;
 window.MutationObserver=class extends original{constructor(fn){super((records,obs)=>{counts.callbacks++;counts.mutations+=records.length;fn(records,obs);});}};
 const query=Document.prototype.querySelectorAll;
 Document.prototype.querySelectorAll=function(...args){const t=performance.now();try{return query.apply(this,args);}finally{counts.scans++;counts.scanMs+=performance.now()-t;}};
 if(PerformanceObserver.supportedEntryTypes.includes("longtask"))new PerformanceObserver(list=>counts.longTasks.push(...list.getEntries().map(e=>e.duration))).observe({type:"longtask",buffered:true});
 addEventListener("scroll",()=>counts.scrollEvents++,{passive:true});
 let last=0;function frame(t){if(last)counts.frames.push(t-last);last=t;if(counts.frames.length<5000)requestAnimationFrame(frame);}requestAnimationFrame(frame);
}
async function measure(browser,baseline){
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.addInitScript(audit);await page.addInitScript(()=>localStorage.setItem("materialluci-design","m3e"));
 if(baseline)await page.route("**/luci-static/materialluci/*",async route=>{
  const name=new URL(route.request().url()).pathname.split("/").pop(),path="build/baseline-assets/"+name;
  if(fs.existsSync(path))return route.fulfill({path,contentType:name.endsWith(".css")?"text/css":"text/javascript"});
  return route.continue();
 });
 await page.goto(base+"/system.html");await page.waitForSelector("#localtime");
 await page.waitForTimeout(1000);
 await page.evaluate(()=>{const a=acceptance;a.callbacks=a.mutations=a.scans=a.scanMs=0;a.longTasks=[];a.frames=[];const clock=document.getElementById("localtime");window.testTick=setInterval(()=>{clock.value=new Date().toISOString();const span=document.createElement("span");span.textContent="tick";clock.parentElement.append(span);span.remove();},100);});
 for(let i=0;i<10;i++){await page.mouse.wheel(0,60);await page.waitForTimeout(100);}
 await page.waitForTimeout(2000);
 const metrics=await page.evaluate(()=>{clearInterval(testTick);const a=acceptance,f=a.frames.slice().sort((a,b)=>a-b);return {...a,frames:undefined,p95FrameMs:f[Math.floor(f.length*.95)],maxFrameMs:Math.max(...f),counts:MaterialFeedback.counts?.(),extras:MaterialExtras.counts(),controls:MaterialControls.count()};});
 reports.push({version,engine:"chromium",baseline,metrics});await page.close();
}
async function verify(browser,engine,width,mode,design){
 const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 await page.addInitScript(audit);
 await page.addInitScript(({mode,design})=>{localStorage.setItem("materialluci-mode",mode);if(design)localStorage.setItem("materialluci-design",design);},{mode,design});
 await page.goto(base+"/system.html");await page.waitForSelector("#localtime");
 assert.equal(await page.locator("html").getAttribute("data-design"),design||"m3e","package design default");
 for(const name of ["general","logging","timesync","zram"]){
  await page.locator('.cbi-tabmenu li[data-tab="'+name+'"] a').click();
  const pane=page.locator('#view [data-tab-title][data-tab="'+name+'"]');
  await page.waitForFunction(name=>document.querySelector('#view [data-tab-title][data-tab="'+name+'"]').dataset.tabActive==="true",name);
  assert.equal(await page.locator("#view [data-tab-title]:visible").count(),1);
  const field=pane.locator('input[type=text]:not([readonly]),textarea').first();
  if(await field.count()){await field.fill(name==="general"?"AX3000T":"64");}
  await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,document.documentElement.scrollHeight);});
  await page.waitForTimeout(500);
  const before=await page.evaluate(()=>({y:scrollY,h:document.documentElement.scrollHeight,textarea:document.querySelector("textarea")?.getBoundingClientRect().height,mutations:acceptance.mutations}));
  for(let tick=0;tick<30;tick++){
   if(tick%5===0){await page.mouse.wheel(0,150);await page.evaluate(()=>{window.dispatchEvent(new Event("resize"));visualViewport?.dispatchEvent(new Event("resize"));visualViewport?.dispatchEvent(new Event("scroll"));});}
   await page.waitForTimeout(1000);
  }
  const after=await page.evaluate(()=>({y:scrollY,h:document.documentElement.scrollHeight,textarea:document.querySelector("textarea")?.getBoundingClientRect().height,mutations:acceptance.mutations}));
  assert(Math.abs(before.h-after.h)<=1,"growing document "+JSON.stringify({name,before,after}));
  assert(Math.abs(before.y-after.y)<=1,"unsolicited scrolling "+JSON.stringify({name,before,after}));
  assert.equal(after.textarea,before.textarea,"growing textarea");
  assert(after.mutations-before.mutations<3000,"mutation storm");
  reports.push({version,engine,width,mode,design:design||"default-m3e",tab:name,before,after});
 }
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:out+"/"+version+"-"+engine+"-"+width+"-"+mode+"-"+(design||"default")+"-system.png",fullPage:true});
 await page.goto(base+"/sshkeys.html");await page.waitForSelector(".add-item>button");
 const input=page.locator(".add-item>input"),button=page.locator(".add-item>button");
 const a=await input.boundingBox(),b=await button.boundingBox();
 assert(a.width>=180,"SSH input squeezed");assert(b.height>=48);
 assert(a.x+a.width<=width+1&&b.x+b.width<=width+1,"SSH overflow");
 assert(a.y+a.height<=b.y+1||Math.abs(a.y-b.y)<=4,"SSH row alignment");
 assert.equal(await page.locator(".add-item").evaluate(el=>el.firstElementChild.tagName+":"+el.lastElementChild.tagName),"INPUT:BUTTON");
 await input.fill("invalid key");await input.press("Enter");await page.waitForSelector("#modal_overlay .warning");
 assert.deepEqual(await page.evaluate(()=>systemFixtureCalls),[]);
 await page.evaluate(async()=>{(await L.require("ui")).hideModal();});
 // Structurally valid Ed25519 test key, no device or real secret.
 const key="ssh-ed25519 "+Buffer.concat([Buffer.from([0,0,0,11]),Buffer.from("ssh-ed25519"),Buffer.from([0,0,0,32]),Buffer.alloc(32,1)]).toString("base64")+" acceptance";
 await input.fill(key);await button.click();await page.waitForFunction(()=>systemFixtureCalls.length===1);
 assert.equal(await page.evaluate(()=>systemFixtureCalls[0].mode),384);
 await page.waitForSelector(".cbi-dynlist>.item");
 await input.fill(key);await input.press("Enter");await page.waitForSelector("#modal_overlay .warning");
 assert.equal(await page.evaluate(()=>systemFixtureCalls.length),1,"duplicate key wrote");
 await page.evaluate(async()=>{(await L.require("ui")).hideModal();});
 const dropped=key.replace("acceptance","drop-test").replace(/AQEBAQ/,"AgICAg");
 await page.locator(".cbi-dynlist").evaluate((el,key)=>{const dt=new DataTransfer();dt.items.add(new File([key],"acceptance.pub",{type:"text/plain"}));el.dispatchEvent(new DragEvent("drop",{bubbles:true,cancelable:true,dataTransfer:dt}));},dropped);
 await page.waitForFunction(()=>systemFixtureCalls.length===2);
 await page.screenshot({path:out+"/"+version+"-"+engine+"-"+width+"-"+mode+"-"+(design||"default")+"-ssh.png",fullPage:true});
 await page.goto(base+"/syslog.html");await page.waitForSelector("#syslog");
 assert(await page.locator("#syslog").getAttribute("readonly"));
 await page.waitForTimeout(1500);const h=await page.locator("#syslog").evaluate(el=>el.getBoundingClientRect().height);
 await page.mouse.wheel(0,400);await page.waitForTimeout(1500);assert.equal(await page.locator("#syslog").evaluate(el=>el.getBoundingClientRect().height),h);
 assert.deepEqual(errors,[]);await page.close();
}
try{
 for(let i=0;i<50;i++){try{if((await fetch(base)).ok)break;}catch{}await pause(200);}
 for(const [engine,type] of [["chromium",chromium],["webkit",webkit]]){
  const browser=await type.launch();
  if(engine==="chromium"){await measure(browser,true);await measure(browser,false);}
  await Promise.all([390,1280].flatMap(width=>["light","dark"].map(mode=>verify(browser,engine,width,mode,null))));
  await verify(browser,engine,1280,"dark","classic");
  await browser.close();
 }
 fs.writeFileSync(out+"/"+version+"-acceptance.json",JSON.stringify(reports,null,2));
 console.log(version+": 30 second tabs, polling, default M3E and explicit Classic, native SSH Enter/click/drop, syslog, performance evidence passed");
}finally{fs.writeFileSync(out+"/"+version+"-acceptance.json",JSON.stringify(reports,null,2));server.kill();}
