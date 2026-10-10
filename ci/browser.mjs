import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import fs from "node:fs";
import {verifySixUI} from "./six-ui.mjs";
const server=spawn("python3",["ci/server.py"],{stdio:"inherit"}),base="http://127.0.0.1:8765";
const pause=ms=>new Promise(r=>setTimeout(r,ms));
fs.mkdirSync("dist/previews",{recursive:true});
const colors=async locator=>locator.evaluate(el=>{const s=getComputedStyle(el);return {background:s.backgroundColor,color:s.color,radius:s.borderRadius};});
try{
 for(let i=0;i<50;i++){try{if((await fetch(base)).ok)break;}catch{}await pause(200);}
 for(const [name,engine] of [["chromium",chromium],["webkit",webkit]]){
  const browser=await engine.launch(),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],requests=[];
  page.on("pageerror",e=>errors.push(e.stack||e.message));page.on("request",r=>requests.push(r.url()));
  await page.goto(base);await page.waitForFunction(()=>window.fixtureCheckbox&&window.fixtureSelect&&document.body.dataset.mlMenus==="ready");
  await page.waitForSelector("#real-widget .ml-switch-hit .mdc-switch");
  assert.equal(await page.locator(".ml-bottom-nav").count(),0);
  assert.deepEqual(await page.locator('meta[name="theme-color"]').evaluateAll(nodes=>nodes.map(n=>n.content)),["#FAFAFA","#121212"]);
  assert(requests.some(url=>/materialluci-menu-v0_3_0-[0-9]+/.test(url)),"versioned menu module not requested");
  assert(!requests.some(url=>new URL(url).pathname.endsWith("/materialluci-menu.js")),"stale menu adapter path used");

  assert.equal(await page.locator("#ml-appearance-button").count(),0);
  assert.deepEqual(await page.locator(".ml-nav-parent").evaluateAll(nodes=>nodes.map(n=>(n.querySelector(".ml-nav-parent-label")||n).textContent.trim())),["状态","系统","服务","网络","退出"]);
  assert.equal(await page.locator(".ml-nav-row .ml-nav-parent").evaluateAll(nodes=>nodes.every(n=>n.tagName==="BUTTON"||n.classList.contains("ml-nav-leaf"))),true);
  assert.equal(await page.locator(".ml-toolbar").evaluate(el=>el.getBoundingClientRect().height),56);
  assert((await page.locator("#maincontent").boundingBox()).width>1000);
  assert.equal(await page.locator('#ml-menu-tree a[href="/cgi-bin/luci/admin/network/network"]').count(),1);
  assert.equal(await page.locator('#ml-menu-tree .ml-nav-parent[aria-controls]').count(),4);
  assert.equal(await page.locator('#ml-menu-tree a[href="/cgi-bin/luci/admin/network/network/devices"]').count(),0);
  assert.equal(await page.locator("#ml-appearance-entry").getAttribute("open"),"true");
  assert.equal(await page.locator("#fixture-theme-field + #ml-appearance-entry").count(),1);
  assert.equal(await page.locator('input[name=optionA]').getAttribute("role"),null);
  assert.equal(await page.locator('input[name=optionB]').getAttribute("role"),null);
  await page.locator("#fixture-name").fill("Unapplied draft");
  await page.locator("#legacy-switch + .mdc-switch").click();
  await page.locator("#real-widget .ml-switch-hit .mdc-switch").click();
  assert.equal(await page.evaluate(()=>fixtureCheckbox.getValue()),"0");
  await page.evaluate(()=>fixtureCheckbox.setValue("1"));
  assert.equal(await page.locator("#real-widget .ml-switch-hit .mdc-switch").getAttribute("aria-checked"),"true");
  await page.evaluate(()=>fixtureSelect.setValue("manual"));
  await page.waitForFunction(()=>document.querySelector("#real-select select")?.value==="manual");
  await page.locator("#real-select select").selectOption("auto");
  assert.equal(await page.evaluate(()=>fixtureSelect.getValue()),"auto");
  await page.locator('#fixture-form input[type=submit]').click();
  assert.equal(await page.evaluate(()=>fixtureSubmissions),1);
  assert.equal(await page.evaluate(()=>fixtureData.hostname),"Unapplied draft");
  assert.equal(await page.evaluate(()=>fixtureData.realflag),"1");
  assert.equal(await page.evaluate(()=>fixtureData.mode),"auto");
  await page.evaluate(()=>document.querySelector("#real-widget input[type=checkbox]").disabled=true);
  assert.equal(await page.locator("#real-widget .ml-switch-hit .mdc-switch").isDisabled(),true);
  if(name==="chromium"){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:"dist/previews/desktop-light.png"});await page.locator("#fixture-clients").scrollIntoViewIfNeeded();await page.screenshot({path:"dist/previews/desktop-tables.png"});}
  if((await page.locator("#ml-appearance-entry").getAttribute("open"))!=="true")await page.locator("#ml-appearance-entry>summary").click();await page.waitForSelector("#ml-appearance");
  assert.equal(await page.locator(".ml-swatch-item").count(),20);
  await page.locator(".ml-choice").filter({hasText:"跟随系统"}).click();
  await page.getByRole("radio",{name:"深色",exact:true}).click();await page.waitForSelector(".ml-backdrop",{state:"detached"});
  assert.equal(await page.locator("html").getAttribute("data-theme"),"dark");
  await page.locator("#ml-hex").fill("#FFFF00");await page.locator("#ml-hex").dispatchEvent("input");
  assert.equal(await page.evaluate(()=>MaterialAppearance.prefs.seed),"#FFFF00");
  await page.locator("#ml-hex").fill("#42A5F5");await page.locator("#ml-hex").dispatchEvent("input");
  assert.equal(await page.locator("#fixture-name").inputValue(),"Unapplied draft");
  await page.locator("#ml-appearance-entry>summary").click();
  const button=page.locator("#fixture-start");
  const normal=await colors(button);assert.equal(normal.radius,"2px");
  await button.hover();const hovered=await colors(button);assert.equal(hovered.color,normal.color);
  await page.mouse.down();const pressed=await colors(button);assert.equal(pressed.color,normal.color);await page.mouse.up();
  await page.mouse.move(0,0);await page.waitForTimeout(550);assert.deepEqual(await colors(button),normal);
  const tab=page.locator("#fixture-device-tab");await tab.hover();
  const tabColor=await colors(tab);
  assert(!["rgb(238, 238, 238)","rgb(255, 255, 255)"].includes(tabColor.background),"legacy light hover in dark theme");
  for(const selector of [".cbi-button-edit",".cbi-button-reload",".cbi-button-remove",".cbi-button-positive.important",".cbi-button-negative"]){
   const b=page.locator(selector).first(),before=await colors(b);await b.hover();await page.mouse.down();
   assert.equal((await colors(b)).color,before.color,selector+" changed foreground");await page.mouse.up();await page.mouse.move(0,0);
  }
  assert.equal(await page.locator("#fixture-startup button:disabled").evaluate(el=>getComputedStyle(el).boxShadow),"none");
  assert.equal(await page.locator(".ifacebox-head").evaluate(el=>getComputedStyle(el).color),"rgb(0, 0, 0)","zone header contrast in dark theme");
  if(name==="chromium"){await page.locator("#fixture-clients").scrollIntoViewIfNeeded();await page.screenshot({path:"dist/previews/desktop-dark-tables.png"});}

  // Exercise firmware environments which only expose requestpath.
  const menuName=new URL(requests.find(url=>url.includes("/materialluci-menu-v"))).pathname.split("/").pop().slice(0,-3);
  await page.evaluate(async(name)=>{
   const ui=await L.require("ui"),module=await L.require(name);
   const path=L.env.dispatchpath;delete L.env.dispatchpath;module.render(await ui.menu.load());L.env.dispatchpath=path;
  },menuName);
  assert.deepEqual(await page.locator(".ml-nav-parent").evaluateAll(nodes=>nodes.map(n=>(n.querySelector(".ml-nav-parent-label")||n).textContent.trim())),["状态","系统","服务","网络","退出"]);
  assert.equal(await page.locator(".ml-nav-row .ml-nav-parent").evaluateAll(nodes=>nodes.every(n=>n.tagName==="BUTTON"||n.classList.contains("ml-nav-leaf"))),true);
  await page.goto(base+"/network.html");await page.waitForFunction(()=>document.body.dataset.mlMenus==="ready");
  assert.deepEqual(await page.locator("#tabmenu a").allTextContents(),["接口","设备","全局网络选项"]);
  assert.equal(await page.locator("#tabmenu li.active a").textContent(),"设备");
  assert.equal(await page.locator('#ml-menu-tree a[aria-current=page]').textContent(),"接口");
  await page.goto(base);await page.waitForFunction(()=>window.fixtureCheckbox&&document.body.dataset.mlMenus==="ready");
  for(const width of [320,360,390,412,768,1024,1280,1440]){
   await page.setViewportSize({width,height:915});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+": document overflow at "+width);
   assert.equal(await page.locator("#fixture-clients").evaluate(el=>el.parentElement.className),"ml-table-scroll");
   if(width<=768)assert(await page.locator("#fixture-clients").evaluate(el=>el.parentElement.scrollWidth>el.parentElement.clientWidth),"wide table must scroll locally");
   assert((await page.locator("#fixture-clients .tr").nth(1).boundingBox()).height<130,"rate columns squeezed vertically");
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));
  await page.waitForFunction(()=>document.getElementById("ml-sidebar").inert===true);
  assert.equal(await page.locator("#ml-sidebar").evaluate(el=>el.inert),true);
  await page.locator("#ml-menu-button").click();
  const networkGroup=page.locator('.ml-nav-parent[aria-controls]').filter({hasText:"网络"});
  await networkGroup.focus();
  const networkInitial=await networkGroup.getAttribute("aria-expanded");
  await page.keyboard.press("Enter");
  assert.equal(await networkGroup.getAttribute("aria-expanded"),networkInitial==="true"?"false":"true");
  await page.keyboard.press(" ");
  assert.equal(await networkGroup.getAttribute("aria-expanded"),networkInitial);
  assert.equal(await page.locator("#ml-menu-button").getAttribute("aria-expanded"),"true");
  assert.equal(await page.locator("#ml-sidebar").getAttribute("aria-modal"),"true");
  assert.equal(await page.locator("#maincontent").evaluate(el=>el.inert),true);
  if(name==="chromium")await page.screenshot({path:"dist/previews/mobile-drawer.png"});
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#ml-menu-button").getAttribute("aria-expanded"),"false");
  assert.equal(await page.locator("#maincontent").evaluate(el=>el.inert),false);
  assert.equal(await page.evaluate(()=>document.activeElement.id),"ml-menu-button");
  await page.locator("#fixture-name").focus();assert.equal(await page.locator("#fixture-name").evaluate(el=>getComputedStyle(el).fontSize),"16px");
  assert.equal(await page.locator("#fixture-name").evaluate(el=>getComputedStyle(el).outlineStyle),"none");
  if(name==="chromium")await page.screenshot({path:"dist/previews/mobile-dark.png"});
  await page.evaluate(async()=>{const ui=await L.require("ui");const field=document.createElement("input");field.id="modal-input";field.type="text";field.value="draft";const flag=new ui.Checkbox("0",{name:"dialogflag"});const actions=document.createElement("div");actions.className="right";const close=document.createElement("button");close.textContent="关闭";close.className="cbi-button";close.onclick=()=>ui.hideModal();actions.append(close);ui.showModal("真实 LuCI 弹窗",[field,flag.render(),actions]);});
  await page.waitForSelector("#modal-input");
  // A modal checkbox outside a CBI boolean field remains a checkbox.
  assert.equal(await page.locator('#modal_overlay input[type=checkbox]').getAttribute("role"),null);
  await page.setViewportSize({width:390,height:360});await page.locator("#modal-input").fill("keyboard draft");
  const modal=await page.locator("#modal_overlay>.modal").boundingBox();assert(modal.y>=0&&modal.y+modal.height<=361);
  await page.getByRole("button",{name:"关闭",exact:true}).click();
  await page.waitForFunction(()=>!document.body.classList.contains("modal-overlay-active"));

  await page.setViewportSize({width:1440,height:900});
  // Real LuCI status/modal APIs, with no router writes. The official MDC
  // instance survives the apply countdown's repeated content replacement.
  await page.evaluate(async()=>{
   window.fixtureUI=await L.require("ui");
   fixtureUI.changes.displayStatus("notice spinning",E("p","正在等待配置被应用… 30"));
  });
  await page.waitForSelector("#ml-mdc-wait-progress");
  assert.equal(await page.locator("#ml-mdc-wait-progress .mdc-linear-progress__bar").count(),2);
  assert.equal(await page.locator("#ml-mdc-wait-progress").getAttribute("aria-valuenow"),null);
  assert.equal(await page.evaluate(()=>document.querySelector("#ml-mdc-wait-progress").parentElement.id),"modal_overlay");
  assert.equal(await page.locator("#modal_overlay>.modal").evaluate(el=>el.lastChild.tagName),"P","adapter changed the business modal children");
  await page.evaluate(()=>{
   window.fixtureProgressRoot=document.querySelector("#ml-mdc-wait-progress");
   window.fixtureProgressAnimation=fixtureProgressRoot.querySelector(".mdc-linear-progress__primary-bar").getAnimations()[0];
   window.fixtureProgressTime=fixtureProgressAnimation.currentTime;
  });
  await page.waitForTimeout(220);
  assert(await page.evaluate(()=>fixtureProgressAnimation.currentTime>fixtureProgressTime),"indeterminate animation does not advance");
  await page.evaluate(()=>fixtureUI.changes.displayStatus("notice spinning",E("p","正在等待配置被应用… 29")));
  await page.waitForTimeout(100);
  assert(await page.evaluate(()=>document.querySelector("#ml-mdc-wait-progress")===fixtureProgressRoot),"countdown restarted MDC component");
  assert(await page.evaluate(()=>fixtureProgressRoot.querySelector(".mdc-linear-progress__primary-bar").getAnimations()[0]===fixtureProgressAnimation),"countdown restarted animation");
  assert.equal(await page.locator("#ml-mdc-wait-progress").count(),1);
  assert.equal(await page.locator("#ml-mdc-wait-progress .mdc-linear-progress__bar-inner").first().evaluate(el=>getComputedStyle(el).borderColor),await page.evaluate(()=>{const probe=document.createElement("span");probe.style.color="var(--control-accent)";document.body.append(probe);const color=getComputedStyle(probe).color;probe.remove();return color;}));
  await page.waitForTimeout(300);
  const desktopBusy=await page.locator("#modal_overlay>.modal").boundingBox(),desktopProgress=await page.locator("#ml-mdc-wait-progress").boundingBox();
  assert(desktopBusy.width>=320&&desktopProgress.x>=desktopBusy.x&&desktopProgress.x+desktopProgress.width<=desktopBusy.x+desktopBusy.width+1);
  assert(desktopProgress.y>=desktopBusy.y&&desktopProgress.y+desktopProgress.height<=desktopBusy.y+desktopBusy.height+1,"desktop progress outside dialog");
  if(name==="chromium")await page.screenshot({path:"dist/previews/mdc-apply-dark.png"});
  await page.evaluate(()=>fixtureUI.changes.displayStatus("notice",E("p","配置已应用")));
  await page.waitForSelector("#ml-mdc-wait-progress",{state:"detached"});
  assert.equal(await page.locator("#modal_overlay>.modal").getAttribute("aria-owns"),null);
  await page.evaluate(()=>fixtureUI.hideModal());
  // opkg removes dlg.lastChild when execution finishes. The MDC element must
  // be outside that sequence, then disappear while logs/actions remain intact.
  await page.evaluate(()=>{
   const dlg=fixtureUI.showModal("执行软件包操作",[E("p",{class:"spinning"},"正在执行")]);
   window.fixtureOpkgDialog=dlg;window.fixtureOpkgBusy=dlg.lastChild;
  });
  await page.waitForSelector("#ml-mdc-wait-progress");
  assert(await page.evaluate(()=>fixtureOpkgDialog.lastChild===fixtureOpkgBusy));
  await page.evaluate(()=>{
   fixtureOpkgDialog.removeChild(fixtureOpkgDialog.lastChild);
   fixtureOpkgDialog.appendChild(E("pre",{id:"fixture-opkg-result"},"操作结果"));
   fixtureOpkgDialog.appendChild(E("div",{class:"right"},E("button",{class:"cbi-button",click:()=>fixtureUI.hideModal()},"完成")));
  });
  await page.waitForSelector("#ml-mdc-wait-progress",{state:"detached"});
  assert.equal(await page.locator("#fixture-opkg-result").textContent(),"操作结果");
  await page.evaluate(()=>fixtureUI.hideModal());
  await page.evaluate(()=>fixtureUI.showModal("确认操作",[E("p","请确认"),E("button",{class:"cbi-button"},"确认")]));
  await page.waitForTimeout(80);
  assert.equal(await page.locator("#ml-mdc-wait-progress").count(),0,"ordinary confirmation shows a busy indicator");
  await page.evaluate(()=>fixtureUI.showModal("上传文件",[E("p",{class:"spinning"},"上传中"),E("div",{class:"cbi-progressbar"},E("div",{style:"width:50%"}))]));
  await page.waitForTimeout(80);
  assert.equal(await page.locator("#ml-mdc-wait-progress").count(),0,"known upload progress duplicated");
  await page.setViewportSize({width:390,height:360});
  await page.evaluate(()=>fixtureUI.showModal("读取配置",[E("p",{class:"spinning"},"正在读取配置…")]));
  await page.waitForSelector("#ml-mdc-wait-progress");
  await page.waitForTimeout(180);
  const progressBox=await page.locator("#ml-mdc-wait-progress").boundingBox(),busyBox=await page.locator("#modal_overlay>.modal").boundingBox();
  assert(busyBox.width>=320,"short mobile status dialog collapsed");
  assert(await page.locator("#modal_overlay>.modal>h4").evaluate(el=>{const s=getComputedStyle(el);return el.getBoundingClientRect().height-parseFloat(s.paddingTop)-parseFloat(s.paddingBottom)<35;}),"short dialog title wraps");
  assert(progressBox.x>=busyBox.x&&progressBox.x+progressBox.width<=busyBox.x+busyBox.width+1,JSON.stringify({engine:name,progressBox,busyBox}));
  assert(progressBox.y>=busyBox.y&&progressBox.y+progressBox.height<=busyBox.y+busyBox.height+1,"progress outside modal on reduced mobile viewport");
  if(name==="chromium")await page.screenshot({path:"dist/previews/mdc-wait-mobile.png"});
  await page.emulateMedia({reducedMotion:"reduce"});
  assert.equal(await page.locator("#ml-mdc-wait-progress .mdc-linear-progress__primary-bar").evaluate(el=>getComputedStyle(el).animationName),"none");
  assert.equal(await page.locator("#modal_overlay>.modal p").textContent(),"正在读取配置…");
  await page.evaluate(()=>fixtureUI.hideModal());
  await page.waitForSelector("#ml-mdc-wait-progress",{state:"detached"});
  await page.emulateMedia({reducedMotion:"no-preference"});

  await page.setViewportSize({width:844,height:390});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"landscape overflow");
  await page.goto(base+"/opkg.html");await page.waitForFunction(()=>document.querySelectorAll("#packages .tr").length>2&&document.body.dataset.mlMenus==="ready");
  assert.equal(await page.locator('#ml-menu-tree a[aria-current=page]').textContent(),"软件包");
  for(const width of [390,768,1440]){
   await page.setViewportSize({width,height:900});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"real opkg page overflow");
   const install=page.locator('#packages .btn').filter({hasText:"Install"}).first();
   assert((await install.boundingBox()).width>=88,"opkg action squeezed");
   assert.equal(await install.evaluate(el=>getComputedStyle(el).whiteSpace),"nowrap");
   assert.equal(await page.locator('#packages .btn[disabled]').first().getAttribute("aria-disabled"),"true");
   const field=page.locator('input[name="filter"]'),clear=field.locator('..').locator("button");
   const a=await field.boundingBox(),b=await clear.boundingBox();
   assert(a.x+a.width<=b.x+1||a.y+a.height<=b.y+1,"opkg input overlaps clear button");
  }
  await page.waitForFunction(()=>{const track=document.querySelector(".cbi-progressbar"),fill=track?.querySelector("div");return fill&&Math.abs(fill.getBoundingClientRect().width/track.getBoundingClientRect().width-0.8)<0.02;});
  if(name==="chromium"){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:"dist/previews/opkg-desktop.png"});}
  await page.goto(base+"/login.html");await page.waitForSelector(".ml-login");
  assert.equal(await page.locator('input[name="luci_password"]').getAttribute("autocomplete"),"current-password");
  assert.equal(await page.locator("form").getAttribute("method"),"post");
  assert.equal(await page.locator("#ml-sidebar").isVisible(),false);
  assert.equal(errors.length,0,errors.join("\n"));assert(requests.every(url=>url.startsWith(base)),name+": external request");
  // Explicitly model visual-only keyboard resizing + Safari viewport panning.
  const keyboard=await browser.newPage({viewport:{width:390,height:844}});
  await keyboard.addInitScript(()=>{
   class Viewport extends EventTarget{height=844;width=390;offsetTop=0;offsetLeft=0;scale=1;}
   window.fixtureViewport=new Viewport();Object.defineProperty(window,"visualViewport",{configurable:true,value:fixtureViewport});
  });
  await keyboard.goto(base);await keyboard.waitForFunction(()=>window.fixtureCheckbox&&document.body.dataset.mlMenus==="ready");
  await keyboard.evaluate(async()=>{
   const ui=await L.require("ui"),content=document.createElement("div");content.id="keyboard-content";
   for(let i=0;i<12;i++){const label=document.createElement("label");label.textContent="字段 "+i;const field=document.createElement("input");field.id="keyboard-field-"+i;field.value="original";content.append(label,field);}
   const actions=document.createElement("div");actions.className="right";const close=document.createElement("button");close.textContent="完成";close.className="cbi-button";close.onclick=()=>ui.hideModal();actions.append(close);
   ui.showModal("编辑配置",[content,actions]);
   fixtureViewport.height=340;fixtureViewport.offsetTop=40;fixtureViewport.dispatchEvent(new Event("resize"));fixtureViewport.dispatchEvent(new Event("scroll"));
  });
  await keyboard.waitForFunction(()=>getComputedStyle(document.documentElement).getPropertyValue("--ml-vv-height")==="340px");
  const overlay=await keyboard.locator("#modal_overlay").boundingBox();assert.equal(overlay.y,40);assert.equal(overlay.height,340);
  const kbModal=await keyboard.locator("#modal_overlay>.modal").boundingBox();assert(kbModal.y>=40&&kbModal.y+kbModal.height<=381);
  await keyboard.locator("#keyboard-field-11").fill("retained draft");
  await keyboard.waitForTimeout(350);
  const input=await keyboard.locator("#keyboard-field-11").boundingBox();assert(input.y>=40&&input.y+input.height<=380,"input hidden below simulated keyboard");
  const commands=await keyboard.locator("#modal_overlay .right").boundingBox();
  assert(commands.y>=40&&commands.y+commands.height<=381,"modal commands hidden by keyboard");
  assert(input.y+input.height<=commands.y,"focused field obscured by modal commands");
  assert.equal(await keyboard.locator("#keyboard-field-11").inputValue(),"retained draft");
  assert.equal(await keyboard.evaluate(()=>document.body.style.height),"");
  if(name==="chromium")await keyboard.screenshot({path:"dist/previews/mobile-keyboard.png"});
  await keyboard.evaluate(()=>{fixtureViewport.height=844;fixtureViewport.offsetTop=0;fixtureViewport.dispatchEvent(new Event("resize"));});
  await keyboard.getByRole("button",{name:"完成",exact:true}).click();
  await keyboard.waitForFunction(()=>!document.body.classList.contains("modal-overlay-active"));
  // Also verify a final field in the natural document can scroll above a
  // visual-only keyboard, without altering its value or imposing a body height.
  await keyboard.evaluate(()=>{
   const field=document.createElement("input");field.id="keyboard-last-field";field.type="text";field.value="last draft";document.getElementById("maincontent").append(field);
   fixtureViewport.height=340;fixtureViewport.offsetTop=0;fixtureViewport.dispatchEvent(new Event("resize"));
  });
  await keyboard.locator("#keyboard-last-field").focus();await keyboard.waitForTimeout(400);
  assert.equal(await keyboard.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue("--ml-keyboard-space")),"504px");
  const last=await keyboard.locator("#keyboard-last-field").boundingBox();assert(last.y>=0&&last.y+last.height<=340,"last document field hidden by keyboard");
  assert.equal(await keyboard.locator("#keyboard-last-field").inputValue(),"last draft");
  await keyboard.evaluate(()=>{fixtureViewport.height=844;fixtureViewport.dispatchEvent(new Event("resize"));});
  await keyboard.waitForFunction(()=>getComputedStyle(document.documentElement).getPropertyValue("--ml-keyboard-space")==="0px");
  assert.equal(await keyboard.locator("#keyboard-last-field").inputValue(),"last draft");
  await keyboard.close();await verifySixUI(browser,name,base);await browser.close();
  console.log(name+": menu hierarchy, native widgets, field submission, tables, dark states, density, drawers, modals, keyboard viewport and login passed");
 }
}finally{server.kill();
console.log("Preview PNGs and source identity are uploaded as a workflow artifact.");

}
