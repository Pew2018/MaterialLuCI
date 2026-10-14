import {webkit} from "playwright";
import {spawn} from "node:child_process";
import fs from "node:fs";
const server=spawn("python3",["ci/server.py"],{stdio:"inherit"}),out="dist/wheel-probe";fs.mkdirSync(out,{recursive:true});
for(let i=0;i<100;i++){try{await fetch("http://127.0.0.1:8765");break;}catch{await new Promise(r=>setTimeout(r,50));}}
const browser=await webkit.launch({headless:false}),results=[];
try{
for(const variant of ["original","root-chain-auto","all-chain-auto","no-css","plain"]){
 const page=await browser.newPage({viewport:{width:1280,height:844}});
 await page.addInitScript(()=>{window.wheels=[];window.scrolls=[];document.addEventListener("wheel",e=>setTimeout(()=>wheels.push({target:e.target.id||e.target.tagName,delta:e.deltaY,prevented:e.defaultPrevented}),0),{passive:true});document.addEventListener("scroll",e=>scrolls.push({target:e.target.id||e.target.nodeName,top:scrollY}),{capture:true,passive:true});});
 await page.goto("http://127.0.0.1:8765/system.html");
 await page.waitForSelector(".cbi-tabmenu");
 await page.evaluate(async()=>{const poll=await L.require("poll");poll.stop();const form=await L.require("form"),m=new form.JSONMap({ntp:{}},"Long form"),s=m.section(form.NamedSection,"ntp","ntp");for(let i=0;i<40;i++)s.option(form.Value,"server"+i,"Server "+i);view.append(await m.render());});
 await page.waitForTimeout(500);
 if(variant==="root-chain-auto")await page.addStyleTag({content:"html{overscroll-behavior-y:auto}"});
 if(variant==="all-chain-auto")await page.addStyleTag({content:"*{overscroll-behavior:auto!important}"});
 if(variant==="no-css")await page.evaluate(()=>{for(const el of document.querySelectorAll("link[rel=stylesheet],style"))el.remove();});
 if(variant==="root-auto")await page.addStyleTag({content:"html{height:100%;overflow-y:auto}"});
 if(variant==="body-auto")await page.addStyleTag({content:"body{height:100vh;overflow-y:auto}"});
 if(variant==="no-sticky")await page.addStyleTag({content:".ml-toolbar,.ml-sidebar{position:static}"});
 if(variant==="plain")await page.setContent("<!doctype html><style>body{margin:0}</style><div style='height:4000px;background:linear-gradient(white,gray)'>Plain wheel capability probe</div>");
 if(variant==="click-blank")await page.mouse.click(1260,150);
 if(variant==="reset-scroll"){await page.evaluate(()=>scrollTo(0,20));await page.waitForTimeout(100);await page.evaluate(()=>scrollTo(0,0));}
 await page.mouse.move(1260,500);
 for(let i=0;i<8;i++){await page.mouse.wheel(0,160);await page.waitForTimeout(80);}
 const data=await page.evaluate(()=>({top:scrollY,wheels:window.wheels,scrolls:window.scrolls,height:document.scrollingElement.scrollHeight,hit:document.elementFromPoint(1260,500)?.outerHTML.slice(0,200),ancestors:[document.documentElement,document.body,document.querySelector(".ml-layout"),document.querySelector("#page-content"),document.querySelector("#maincontent")].filter(Boolean).map(n=>({tag:n.id||n.tagName,overflow:getComputedStyle(n).overflow,overscroll:getComputedStyle(n).overscrollBehavior,height:n.clientHeight,scrollHeight:n.scrollHeight}))}));
 results.push({variant,...data});console.log(JSON.stringify(results.at(-1)));await page.screenshot({path:out+"/"+variant+".png"});await page.close();
}
}finally{await browser.close();server.kill();fs.writeFileSync(out+"/results.json",JSON.stringify(results,null,2));}
