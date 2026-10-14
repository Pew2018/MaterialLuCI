import {chromium} from "playwright";
import {spawn,execFileSync} from "node:child_process";
import fs from "node:fs";
const server=spawn("python3",["ci/server.py"],{stdio:"inherit"});
const origin="http://127.0.0.1:8765",base="build/stage/www/luci-static/materialluci/",baseline="ce53d2bcaea919f32c1465df82429740b9e18d1a";
fs.mkdirSync("dist/ui-refinement",{recursive:true});
for(let i=0;i<100;i++){try{await fetch(origin);break;}catch{await new Promise(r=>setTimeout(r,50));}}
const browser=await chromium.launch(),results=[];
try{
 for(const revision of ["before","after"])for(const design of ["classic","m3e"])for(const theme of ["light","dark"])for(const cards of ["true","false"]){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  if(revision==="before"){
   for(const file of ["runtime.js","surfaces.js","feedback.js","controls.js","app.js","base.css","cascade.css","design-m3.css"]){
    const content=execFileSync("git",["show",baseline+":theme/root/www/luci-static/materialluci/"+file],{encoding:"utf8"});
    await page.route("**/luci-static/materialluci/"+file+"?**",route=>route.fulfill({body:content,contentType:file.endsWith(".css")?"text/css":"text/javascript"}));
   }
  }
  await page.addInitScript(({design,theme,cards})=>{localStorage.setItem("materialluci-design",design);localStorage.setItem("materialluci-mode",theme);localStorage.setItem("materialluci-cards",cards);},{design,theme,cards});
  await page.goto(origin+"/upstream.html");await page.waitForSelector("#ml-appearance-entry");
  await page.evaluate(()=>{
   // Large lease/firewall-style table + real controls; no router RPC.
   const table=document.createElement("table");table.className="table";table.id="polling";
   table.innerHTML="<tr><th>Host</th><th>Address</th><th>Expires</th><th>Action</th></tr>";
   for(let i=0;i<400;i++){const r=table.insertRow();r.innerHTML='<td>host-'+i+'</td><td>192.0.2.'+(i%255)+'</td><td class="clock">12h</td><td><button type="button" class="cbi-button">Edit</button></td>';}
   const section=document.createElement("section");section.className="cbi-section";section.append(table);
   document.getElementById("view").replaceChildren(section);MaterialSurfaces.prepare();
  });
  await page.waitForTimeout(1500);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const client=await page.context().newCDPSession(page);
  await client.send("Tracing.start",{categories:"devtools.timeline,v8,blink.user_timing",transferMode:"ReturnAsStream"});
  const sample=await page.evaluate(async()=>{
   const before=MaterialSurfaces.count(),instances=MaterialFeedback.counts(),long=[],frames=[];
   const observer=new PerformanceObserver(list=>long.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration}))));
   observer.observe({type:"longtask",buffered:false});
   let active=true,last=performance.now(),start=last,updates=0;
   const frame=t=>{frames.push(t-last);last=t;if(active)requestAnimationFrame(frame);};requestAnimationFrame(frame);
   const timer=setInterval(()=>{
    updates++;
    // LuCI polling replaces element content, not only textContent.
    for(const cell of document.querySelectorAll("#polling .clock")){
     const span=document.createElement("span");span.textContent=updates+"h";cell.replaceChildren(span);
    }
   },150);
   for(let i=0;i<40;i++){window.scrollBy(0,i<20?220:-220);await new Promise(r=>setTimeout(r,40));}
   clearInterval(timer);await new Promise(r=>setTimeout(r,300));active=false;observer.disconnect();
   const sorted=frames.slice().sort((a,b)=>a-b);
   return {duration:performance.now()-start,updates,surfacePasses:MaterialSurfaces.count()-before,instancesBefore:instances,instancesAfter:MaterialFeedback.counts(),waitInstances:MaterialWait.activeCount(),longTasks:long,frameCount:frames.length,frameP95:sorted[Math.floor(sorted.length*.95)],framesOver34:frames.filter(t=>t>34).length,scope:"Headless Chromium CI synthetic scrolling/polling fixture; not device FPS"};
  });
  const complete=new Promise(resolve=>client.once("Tracing.tracingComplete",resolve));await client.send("Tracing.end");const {stream}=await complete;
  let trace="";while(true){const part=await client.send("IO.read",{handle:stream});trace+=part.data;if(part.eof)break;}await client.send("IO.close",{handle:stream});
  fs.writeFileSync("dist/ui-refinement/scroll-"+revision+"-"+design+"-"+theme+"-"+cards+"-trace.json",trace);
  const events=JSON.parse(trace).traceEvents.filter(e=>e.ph==="X");
  const totals={};for(const name of ["Layout","UpdateLayoutTree","Paint","RasterTask","FunctionCall","RunTask"]){const selected=events.filter(e=>e.name===name);totals[name]={count:selected.length,totalMs:selected.reduce((sum,e)=>sum+(e.dur||0)/1000,0),maxMs:Math.max(0,...selected.map(e=>(e.dur||0)/1000))};}
  const stacks=events.filter(e=>e.name==="FunctionCall").sort((a,b)=>(b.dur||0)-(a.dur||0)).slice(0,10).map(e=>({durationMs:(e.dur||0)/1000,...e.args?.data}));
  results.push({revision,design,theme,cards,browser:browser.version(),baseline,...sample,costs:totals,heaviestFunctions:stacks});
  await page.close();
 }
}finally{await browser.close();server.kill();fs.writeFileSync("dist/ui-refinement/scroll-comparison.json",JSON.stringify(results,null,2));}
console.log(JSON.stringify(results));
