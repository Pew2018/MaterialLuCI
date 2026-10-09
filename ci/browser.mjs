import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import fs from "node:fs";
const server=spawn("python3",["ci/server.py"],{stdio:"inherit"}),base="http://127.0.0.1:8765";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
fs.mkdirSync("dist/previews",{recursive:true});
try{
 for(let i=0;i<50;i++){try{if((await fetch(base)).ok)break;}catch{}await sleep(200);}
 for(const [name,engine] of [["chromium",chromium],["webkit",webkit]]){
  const browser=await engine.launch(),page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  const requests=[];page.on("request",r=>requests.push(r.url()));
  await page.goto(base);await page.waitForFunction(()=>window.fixtureCheckbox&&window.fixtureSelect&&document.body.dataset.mlGroup);
  await page.waitForSelector("#real-widget .ml-switch");
  assert.equal(await page.locator(".ml-toolbar").evaluate(el=>el.getBoundingClientRect().height),56);
  assert.equal(await page.locator(".ml-nav-inner").evaluate(el=>el.getBoundingClientRect().height),56);
  assert.equal(await page.locator("#maincontent").evaluate(el=>el.getBoundingClientRect().width),620);
  await page.locator("#fixture-name").fill("Unapplied draft");
  await page.locator("#legacy-switch").uncheck();
  await page.locator("#real-widget .ml-switch").uncheck();
  assert.equal(await page.evaluate(()=>fixtureCheckbox.getValue()),"0");
  await page.evaluate(()=>fixtureCheckbox.setValue("1"));
  assert.equal(await page.locator("#real-widget .ml-switch").isChecked(),true);
  await page.evaluate(()=>fixtureSelect.setValue("manual"));
  await page.waitForFunction(()=>document.querySelector("#real-select .ml-choice")?.textContent==="手动");
  await page.locator("#real-select .ml-choice").click();
  await page.getByRole("radio",{name:"自动",exact:true}).click();
  await page.waitForSelector(".ml-backdrop",{state:"detached"});
  assert.equal(await page.evaluate(()=>fixtureSelect.getValue()),"auto");
  await page.locator('#fixture-form input[type=submit]').click();
  assert.equal(await page.evaluate(()=>fixtureSubmissions),1);
  assert.equal(await page.evaluate(()=>fixtureData.hostname),"Unapplied draft");
  assert.equal(await page.evaluate(()=>fixtureData.realflag),"1");
  assert.equal(await page.evaluate(()=>fixtureData.mode),"auto");
  await page.evaluate(()=>document.querySelector("#real-widget input[type=checkbox]").disabled=true);
  assert.equal(await page.locator("#real-widget .ml-switch").isDisabled(),true);
  await page.evaluate(async()=>{const ui=await L.require("ui");const flag=new ui.Checkbox("0",{name:"dialogflag"});ui.showModal("真实 LuCI 弹窗",[flag.render()]);});
  await page.waitForSelector("#modal_overlay .ml-switch");
  assert.equal(await page.locator("#modal_overlay .ml-switch").count(),1);
  await page.evaluate(()=>L.hideModal());
  await page.locator("#page-content").evaluate(el=>el.scrollTop=0);
  if(name==="chromium")await page.screenshot({path:"dist/previews/desktop-light.png"});
  await page.locator("#ml-appearance-button").click();await page.waitForSelector("#ml-appearance");
  assert.equal(await page.locator(".ml-swatch-item").count(),20);
  assert.equal(await page.locator(".ml-bottom-nav").isVisible(),false);
  assert.equal(await page.locator("#ml-menu-button").isVisible(),false);
  await page.locator(".ml-choice").filter({hasText:"跟随系统"}).click();
  await page.getByRole("radio",{name:"深色",exact:true}).click();
  await page.waitForSelector(".ml-backdrop",{state:"detached"});
  assert.equal(await page.locator("html").getAttribute("data-theme"),"dark");
  await page.getByRole("switch",{name:"分组卡片",exact:true}).check();
  await page.getByRole("switch",{name:"顶栏背景",exact:true}).check();
  await page.locator("#ml-hex").fill("#FFFF00");await page.locator("#ml-hex").dispatchEvent("input");
  assert.equal(await page.evaluate(()=>MaterialAppearance.prefs.seed),"#FFFF00");
  await page.locator("#ml-hex").fill("#42A5F5");await page.locator("#ml-hex").dispatchEvent("input");
  await page.locator("#ml-back").click();await page.waitForSelector("#ml-appearance",{state:"detached"});
  assert.equal(await page.locator("#fixture-name").inputValue(),"Unapplied draft");
  assert.equal(await page.locator(".ml-bottom-nav").isVisible(),true);
  await page.locator("#page-content").evaluate(el=>el.scrollTop=0);
  await page.setViewportSize({width:412,height:915});
  if(name==="chromium")await page.screenshot({path:"dist/previews/mobile-dark-cards.png"});
  await page.reload();await page.waitForFunction(()=>window.fixtureCheckbox&&document.body.dataset.mlGroup);
  assert.equal(await page.locator("html").getAttribute("data-theme"),"dark");
  assert.equal(await page.locator("html").getAttribute("data-cards"),"true");
  await page.locator(".ml-bottom-tab[data-group=network]").click();
  await page.getByText("接口",{exact:true}).waitFor({state:"visible"});
  if(name==="chromium")await page.screenshot({path:"dist/previews/network-menu.png"});
  await page.keyboard.press("Escape");await page.waitForSelector(".ml-backdrop",{state:"detached"});
  await page.locator("#ml-appearance-button").click();await page.waitForSelector("#ml-appearance");
  if(name==="chromium")await page.screenshot({path:"dist/previews/appearance-dark.png"});
  await page.locator("#ml-back").click();await page.waitForSelector("#ml-appearance",{state:"detached"});
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.locator("#ml-appearance-button").click();
  assert.equal(await page.locator(".tap-ripple").count(),0);
  await page.locator("#ml-back").click();await page.waitForSelector("#ml-appearance",{state:"detached"});
  for(const width of [320,360,412,1100]){await page.setViewportSize({width,height:915});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+": overflow at "+width);}
  await page.goto(base+"/login.html");await page.waitForSelector(".ml-login");
  assert.equal(await page.locator('input[name="luci_password"]').getAttribute("autocomplete"),"current-password");
  assert.equal(await page.locator("form").getAttribute("method"),"post");
  assert.equal(await page.locator(".ml-bottom-nav").isVisible(),false);
  assert.equal(errors.length,0,errors.join("\n"));
  assert(requests.every(url=>url.startsWith(base)),name+": external browser request");
  await browser.close();console.log(name+": real LuCI widget values, submission, disabled states, modal lifecycle, appearance, history, responsive, login, offline resources passed");
 }
}finally{server.kill();}
// Inline image records allow remote visual review without a browser session or
// granting Actions repository write access. They contain only mock fixture UI.
for(const file of ["desktop-light.png","mobile-dark-cards.png","appearance-dark.png"]){
 const path="dist/previews/"+file;
 if(fs.existsSync(path))console.log("MATERIALLUCI_PREVIEW "+JSON.stringify({file,base64:fs.readFileSync(path).toString("base64")}));
}
