import {chromium,webkit} from "playwright";
import {spawn,execFileSync} from "node:child_process";
import fs from "node:fs";
import assert from "node:assert/strict";
const server=spawn("python3",["ci/server.py"],{stdio:"inherit"}),origin="http://127.0.0.1:8765",out="dist/selection-dialog",results=[];
fs.mkdirSync(out,{recursive:true});
for(let i=0;i<100;i++){try{await fetch(origin);break;}catch{await new Promise(r=>setTimeout(r,50));}}
try{for(const [engine,type]of [["chromium",chromium],["webkit",webkit]].filter(([n])=>n===(process.env.ENGINE||"chromium"))){
const browser=await type.launch({headless:false});
try{for(const design of ["classic","m3e"])for(const theme of ["light","dark"])for(const width of [1280,390,320])for(const revision of ["before","after"]){
 const page=await browser.newPage({viewport:{width,height:844}}),errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 if(revision==="before")for(const file of ["controls.js","cascade.css"])await page.route("**/luci-static/materialluci/"+file+"?**",route=>route.fulfill({body:execFileSync("git",["show","447dcfe70cb454988592fb42510a9cc10dc07e23:theme/root/www/luci-static/materialluci/"+file],{encoding:"utf8"}),contentType:file.endsWith("css")?"text/css":"text/javascript"}));
 await page.addInitScript(c=>{localStorage.setItem("materialluci-design",c.design);localStorage.setItem("materialluci-mode",c.theme);},{design,theme});
 await page.goto(origin+"/opkg.html");await page.locator('[data-mode="installed"]').click();
 await page.locator('#view .cbi-button-negative[data-package="fixture-package-00"]').click();
 await page.waitForSelector("#autoremove-cb");await page.waitForTimeout(500);
 const id=[engine,design,theme,width,revision].join("-");
 const buttons=await page.locator("#modal_overlay .right > .btn").evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {text:n.textContent.trim(),height:r.height,width:r.width};}));
 assert.equal(buttons.length,2);
 const checkbox=page.locator("#autoremove-cb");
 await checkbox.evaluate(n=>{window.changeCount=0;window.inputIdentity=n;window.nativeSibling=n.nextSibling;n.addEventListener("change",()=>changeCount++);});
 const action=design==="m3e"?page.locator("#modal_overlay md-checkbox"):checkbox;
 const checked=await checkbox.isChecked();await action.click();
 await page.waitForTimeout(90);
 const ink=await checkbox.evaluate(n=>{const root=n.parentElement,s=getComputedStyle(root),layer=root.querySelector(".mdc-checkbox__ripple"),p=layer?getComputedStyle(layer,"::after"):null;return {rootWidth:root.getBoundingClientRect().width,fgSize:s.getPropertyValue("--mdc-ripple-fg-size"),fgScale:s.getPropertyValue("--mdc-ripple-fg-scale"),width:p?.width,transform:p?.transform,checked:n.checked,count:changeCount};});
 await page.screenshot({path:out+"/"+id+"-pressed.png"});
 if(revision==="after"){
  assert.ok(Math.abs(buttons[0].height-buttons[1].height)<.5,JSON.stringify(buttons));assert.equal(buttons[0].height,48);
  assert.equal(ink.checked,!checked);assert.equal(ink.count,1);
  if(design==="classic"){const diameter=parseFloat(ink.fgSize)*parseFloat(ink.fgScale);assert.ok(diameter>0&&diameter<=49,JSON.stringify(ink));}
  assert.equal(await checkbox.evaluate(n=>n===inputIdentity&&n.nextSibling===nativeSibling),true);
  await page.waitForTimeout(700);assert.equal(await page.locator(".mdc-ripple-upgraded--foreground-activation").count(),0);
  await action.focus();await page.keyboard.press("Space");assert.equal(await checkbox.isChecked(),checked);
 }
 await page.locator("#modal_overlay .right > .btn").first().click();await page.waitForFunction(()=>!document.body.classList.contains("modal-overlay-active"));
 if(revision==="after"){
  await page.goto(origin+"/upstream.html");await page.waitForSelector("#view .ml-switch-hit");await page.waitForTimeout(500);
  const hit=page.locator("#view .ml-switch-hit").first();await hit.scrollIntoViewIfNeeded();
  const read=()=>hit.evaluate(n=>{const c=n.querySelector(".mdc-switch,md-switch"),i=n.parentElement.querySelector('input[type=checkbox]'),h=c.querySelector(".mdc-switch__handle")||c.shadowRoot?.querySelector(".handle"),r=h?.getBoundingClientRect();return {checked:i?.checked,selected:c.getAttribute("aria-checked")||c.selected,handle:r?[r.x,r.y,r.width,r.height]:null};});
  await page.mouse.move(0,0);await page.waitForTimeout(300);const off=await read();await hit.hover();await page.waitForTimeout(300);const hover=await read();
  assert.equal(hover.checked,off.checked);assert.equal(hover.selected,off.selected);if(design==="classic")assert.deepEqual(hover.handle,off.handle,"Classic hover must not move or resize thumb");
  await page.screenshot({path:out+"/"+id+"-switch-hover.png"});await page.mouse.move(0,0);await page.waitForTimeout(700);
  assert.equal(await page.locator(".mdc-ripple-upgraded--foreground-activation").count(),0);
  results.push({engine,browser:browser.version(),sourceSha:process.env.GITHUB_SHA,design,theme,width,revision,buttons,ink,switchBefore:off,switchHover:hover,errors});
 }else results.push({engine,design,theme,width,revision,buttons,ink,errors});
 assert.deepEqual(errors,[]);fs.writeFileSync(out+"/results.json",JSON.stringify(results,null,2));console.log(id+" complete");await page.close();
}}finally{await browser.close();}
}}finally{server.kill();fs.writeFileSync(out+"/results.json",JSON.stringify(results,null,2));}
