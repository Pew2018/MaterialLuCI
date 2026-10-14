import {traceCosts} from "./trace-costs.mjs";
import {createHash} from "node:crypto";
import {chromium,webkit} from "playwright";
import {spawn,execFileSync} from "node:child_process";
import fs from "node:fs";
import assert from "node:assert/strict";
const baseline="f32790a8a2ccc8217298aa8132edbc1b0f69f92b";
const server=spawn("python3",["ci/server.py"],{stdio:"inherit"}),origin="http://127.0.0.1:8765";
const out="dist/graph-evidence/"+(process.env.ENGINE||"chromium");fs.mkdirSync(out,{recursive:true});
for(let i=0;i<100;i++){try{await fetch(origin);break;}catch{await new Promise(r=>setTimeout(r,50));}}
const results=[],sourceCache=new Map();
function source(revision,file){
 const key=revision+file;if(sourceCache.has(key))return sourceCache.get(key);
 const read=f=>revision==="before"?execFileSync("git",["show",baseline+":theme/root/www/luci-static/materialluci/"+f],{encoding:"utf8"}):fs.readFileSync("theme/root/www/luci-static/materialluci/"+f,"utf8");
 let body=read(file);if(file==="cascade.css")body=read("base.css")+body.replace('@import url("base.css");',"");
 if(file.endsWith(".js"))body=execFileSync("node_modules/.bin/esbuild",["--minify","--target=es2020","--loader=js"],{input:body,encoding:"utf8"});
 sourceCache.set(key,body);return body;
}
const scenarios=[];
for(const design of ["classic","m3e"])for(const count of [1,4])for(const clock of ["off","native","pressure150ms"])scenarios.push({design,theme:"light",cards:"true",width:1280,kind:"native-chart",state:"idle",count,clock,shadow:"normal"});
scenarios.splice(0,scenarios.length,...scenarios.filter(c=>!process.env.DESIGN||c.design===process.env.DESIGN));
try{for(const [engine,type]of [["chromium",chromium],["webkit",webkit]].filter(([name])=>name===(process.env.ENGINE||"chromium"))){
 const browser=await type.launch({headless:false});
 try{for(let repeat=0;repeat<3;repeat++)for(const config of repeat%2?scenarios.slice().reverse():scenarios)for(const revision of ["after"]){
  const {design,theme,cards,width,kind,state}=config;
  const page=await browser.newPage({viewport:{width,height:844}});
  for(const file of ["runtime.js","surfaces.js","feedback.js","controls.js","app.js","cascade.css","design-m3.css"]){
   await page.route("**/luci-static/materialluci/"+file+"?**",route=>route.fulfill({body:source(revision,file),contentType:file.endsWith(".css")?"text/css":"text/javascript"}));
  }
  await page.addInitScript(c=>{window.clockWrites=[];const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value");Object.defineProperty(HTMLInputElement.prototype,"value",{...d,set(v){if(this.id==="localtime"){const start=performance.now();performance.mark("clock-write-start");d.set.call(this,v);performance.mark("clock-write-end");clockWrites.push({start,end:performance.now(),value:v});}else d.set.call(this,v);}});localStorage.setItem("materialluci-design",c.design);localStorage.setItem("materialluci-mode",c.theme);localStorage.setItem("materialluci-cards",c.cards);},config);
  const client=engine==="chromium"?await page.context().newCDPSession(page):null;
  if(client)await client.send("Tracing.start",{categories:"toplevel,devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,disabled-by-default-devtools.timeline.stack,blink.user_timing,cc,gpu,v8",transferMode:"ReturnAsStream"});
  await page.goto(origin+"/upstream.html");
  await page.waitForSelector("#ml-appearance-entry",{state:"attached"});
  await page.evaluate(async c=>{
   const poll=await L.require("poll");poll.stop();
   while(poll.queue.some(e=>!e.r))await new Promise(r=>setTimeout(r,10));
   const renderer=await L.require("view.materialluci-diagnostic-load");
   view.replaceChildren();
   for(let i=0;i<c.count;i++){const data=await renderer.load();view.append(await renderer.render(data));}
   const form=await L.require("form"),m=new form.JSONMap({ntp:{host:"fixed"}},"Scroll extension"),sec=m.section(form.NamedSection,"ntp","ntp");
   for(let i=0;i<16;i++)sec.option(form.Value,"host"+i,"Host "+i);
   view.append(await m.render());
   const originalAdd=poll.add;window.graphUpdates=[];
   poll.add=function(fn,interval){window.nativeGraphUpdate=async()=>{const start=performance.now();performance.mark("graph-update-start");try{return await fn();}finally{performance.mark("graph-update-end");graphUpdates.push({start,end:performance.now()});}};return originalAdd.call(this,nativeGraphUpdate,interval);};
   renderer.pollData();poll.add=originalAdd;
  },config);
  await page.evaluate(async c=>{
   const poll=await L.require("poll");poll.stop();
   while(poll.queue.some(e=>!e.r))await new Promise(r=>setTimeout(r,10));
   const count=graphUpdates.length;await new Promise(r=>setTimeout(r,500));
   if(poll.active()||graphUpdates.length!==count)throw Error("graphs did not settle");
   window.idleProof={pollActive:false,queue:poll.queue.map(e=>({interval:e.i,ready:e.r}))};
   if(c.clock==="native")poll.start();
   if(c.clock==="pressure150ms"){let busy=false;window.pollTimer=setInterval(async()=>{if(busy)return;busy=true;try{await nativeGraphUpdate();}finally{busy=false;}},150);}
  },config);
  await page.waitForTimeout(500);
  await page.evaluate(state=>{
   performance.mark("scroll-measure-start");window.measure={frames:[],mutations:0,updates:0,longTasks:[],start:performance.now(),last:performance.now(),active:true,surfaces:MaterialSurfaces.count(),instances:MaterialFeedback.counts()};
   const m=measure;window.sampleObserver=new MutationObserver(rs=>m.mutations+=rs.length);sampleObserver.observe(view,{subtree:true,childList:true});
   if(PerformanceObserver.supportedEntryTypes.includes("longtask")){window.taskObserver=new PerformanceObserver(l=>m.longTasks.push(...l.getEntries().map(e=>({start:e.startTime,duration:e.duration}))));taskObserver.observe({type:"longtask"});}
   const frame=t=>{m.frames.push(t-m.last);m.last=t;if(m.active)requestAnimationFrame(frame);};requestAnimationFrame(frame);
   m.clockStart=clockWrites.length;m.graphStart=graphUpdates.length;m.scrollEvents=[];m.positions=[];window.scrollProbe=e=>m.scrollEvents.push({time:performance.now()-m.start,target:e.target.id||e.target.className||e.target.nodeName,top:e.target===document?scrollY:e.target.scrollTop});document.addEventListener("scroll",scrollProbe,{capture:true,passive:true});
   window.fixtureClicks=0;view.addEventListener("click",()=>fixtureClicks++);
   if(state==="polling")window.pollTimer=setInterval(()=>{
    m.updates++;const clock=document.querySelector("#localtime");if(clock)clock.value="2026-10-14 03:"+String(m.updates).padStart(2,"0")+":00";for(const n of document.querySelectorAll(".clock"))n.replaceChildren(E("span",m.updates+"h"));
    for(const n of document.querySelectorAll("svg polyline"))n.setAttribute("points","0,140 120,"+(m.updates%80)+" 200,120 300,40 400,80 600,20");
   },150);
  },state);
  await page.mouse.move(width-80,400);
  for(let i=0;i<144;i++){if(i%24===0)await page.evaluate(i=>{performance.mark("scroll-direction-"+i);measure.positions.push({i,time:performance.now(),top:scrollY});},i);await page.mouse.wheel(0,Math.floor(i/24)%2===0?70:-70);await page.waitForTimeout(40);}
  await page.waitForTimeout(120);
  const sample=await page.evaluate(()=>{
   performance.mark("scroll-measure-end");clearInterval(window.pollTimer);measure.active=false;document.removeEventListener("scroll",scrollProbe,true);sampleObserver.disconnect();window.taskObserver?.disconnect();
   const m=measure,a=m.frames.slice().sort((a,b)=>a-b);
   return {measureStart:m.start,graphUpdates:graphUpdates.slice(m.graphStart),clockWrites:clockWrites.slice(m.clockStart),idleProof,positions:m.positions,duration:performance.now()-m.start,mutations:m.mutations,updates:m.updates,longTasks:m.longTasks,raf:{count:a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:Math.max(0,...a),over20:a.filter(x=>x>20).length,over34:a.filter(x=>x>34).length,raw:m.frames},surfacePasses:MaterialSurfaces.count()-m.surfaces,instancesBefore:m.instances,instancesAfter:MaterialFeedback.counts(),waitInstances:MaterialWait.activeCount(),activeAnimations:document.getAnimations().filter(a=>a.playState==="running").map(a=>({name:a.animationName||a.constructor.name,target:a.effect?.target?.className||a.effect?.target?.tagName})),scrollTop:scrollY,scrollEvents:m.scrollEvents,sidebarScroll:document.querySelector(".ml-sidebar")?.scrollTop,modalScroll:document.querySelector(".modal")?.scrollTop,clicks:fixtureClicks,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  let touch=null;
  sample.touch=touch;assert.equal(sample.clicks,0);assert.equal(sample.overflow,false);
  let frameTime=0;sample.frameSpikes=sample.raf.raw.flatMap(gap=>{frameTime+=gap;return gap>34?[{time:frameTime,gap}]:[];});
  const id=[engine,repeat,revision,design,theme,cards,width,kind,state,config.clock,config.count].join("-");
  if(client){
   const done=new Promise(resolve=>client.once("Tracing.tracingComplete",resolve));await client.send("Tracing.end");const {stream}=await done;
   let trace="";while(true){const part=await client.send("IO.read",{handle:stream});trace+=part.data;if(part.eof)break;}await client.send("IO.close",{handle:stream});
   // Retain all raw paired traces, including thread metadata.
   fs.writeFileSync(out+"/"+id+".json.gz",(await import("node:zlib")).gzipSync(trace));
   const events=JSON.parse(trace).traceEvents,start=events.find(e=>e.name==="scroll-measure-start")?.ts,end=events.find(e=>e.name==="scroll-measure-end")?.ts;assert.ok(start&&end,"trace phase markers required");const complete=events.filter(e=>e.ph==="X"&&e.ts>=start&&e.ts<end),costs={};
   for(const name of ["Layout","UpdateLayoutTree","Paint","RasterTask","FunctionCall","RunTask","ThreadControllerImpl::RunTask","CompositeLayers","DrawFrame"]){
    const selected=complete.filter(e=>e.name===name);
    costs[name]={count:selected.length,totalMs:selected.reduce((s,e)=>s+(e.dur||0)/1000,0),maxMs:Math.max(0,...selected.map(e=>(e.dur||0)/1000)),threads:[...new Set(selected.map(e=>e.pid+":"+e.tid))]};
   }
   sample.costs=costs;sample.traceEvidence=traceCosts(events,start,end);sample.traceFile=id+".json.gz";sample.traceSha256=createHash("sha256").update(trace).digest("hex");sample.heaviestFunctions=complete.filter(e=>e.name==="FunctionCall").sort((a,b)=>(b.dur||0)-(a.dur||0)).slice(0,8).map(e=>({durationMs:(e.dur||0)/1000,...e.args?.data}));
   sample.eventNames=[...new Set(events.map(e=>e.name))].filter(n=>/Raster|Task|Composite|Frame/.test(n));
  }
  sample.geometry=await page.evaluate(()=>({scrollY,scrollingTag:document.scrollingElement.tagName,scrollingHeight:document.scrollingElement.scrollHeight,viewport:innerHeight,body:getComputedStyle(document.body).overflow,html:getComputedStyle(document.documentElement).overflow,hit:document.elementFromPoint(innerWidth-80,400)?.outerHTML.slice(0,400)}));sample.validMovement=sample.scrollEvents.length>0&&Math.max(...sample.scrollEvents.map(e=>e.top))-Math.min(...sample.scrollEvents.map(e=>e.top))>200;
  if(!sample.validMovement){await page.screenshot({path:out+"/"+id+"-invalid.png"});results.push({engine,repeat,...config,...sample});fs.writeFileSync(out+"/comparison.json",JSON.stringify(results,null,2));throw Error("Invalid wheel sample: "+JSON.stringify(sample.geometry));}
  results.push({sourceSha:process.env.GITHUB_SHA,engine,browser:browser.version(),repeat,revision,baseline,...config,...sample});
  fs.writeFileSync(out+"/comparison.json",JSON.stringify(results,null,2));console.log(id+" max="+sample.raf.max+" spikes="+sample.raf.over34+" graphs="+sample.graphUpdates.length+" scroll="+sample.scrollEvents.length);
  if(repeat===0&&config.clock==="native"&&config.cards==="true"){await page.screenshot({path:out+"/"+id+".png"});}
  fs.writeFileSync(out+"/case-index.json",JSON.stringify(results.map(r=>({sourceSha:r.sourceSha,engine:r.engine,browser:r.browser,repeat:r.repeat,design:r.design,theme:r.theme,cards:r.cards,width:r.width,kind:r.kind,clock:r.clock,shadow:r.shadow,count:r.count,traceFile:r.traceFile??null,traceSha256:r.traceSha256??null,validMovement:r.validMovement})),null,2));
  await page.close();
 }}finally{await browser.close();}
}}finally{server.kill();fs.writeFileSync(out+"/comparison.json",JSON.stringify(results,null,2));}
fs.writeFileSync(out+"/scope.txt","Wheel input with direction reversal; two paired runs in opposite revision order. rAF intervals are main-thread callback intervals, NOT presented scroll FPS. Chromium traces contain main/compositor/raster categories and thread IDs; WebKit has no CDP trace and is NOT macOS Safari. System view is pinned native LuCI plus JSONMap long NTP extension. Lease/graph structures use native JSONMap controls but representative update fixtures. No router, macOS Safari, real touchpad inertia or WebKit hardware touch gesture validation. Loading starts immediately after native fixture render. No production performance optimization is asserted by this measurement alone.\n");
console.log("Completed "+results.length+" native graph isolation cases. No presented frame or actual Safari claim.");
