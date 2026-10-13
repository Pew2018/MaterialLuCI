import {chromium,webkit} from "playwright";
import {spawn} from "node:child_process";
import fs from "node:fs";
import assert from "node:assert/strict";
const server=spawn("python3",["ci/server.py"],{stdio:"inherit"}),results=[];
const origin="http://127.0.0.1:8765";
for(let i=0;i<100;i++){try{await fetch(origin);break;}catch{await new Promise(r=>setTimeout(r,50));}}
fs.mkdirSync("dist/ui-refinement",{recursive:true});
try{for(const [engine,type] of [["chromium",chromium],["webkit",webkit]]){
 const browser=await type.launch();
 try{for(const design of ["classic","m3e"]){
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on("pageerror",e=>{errors.push(e.message);console.error(engine,design,e.message);});
  await page.addInitScript(design=>{localStorage.setItem("materialluci-design",design);localStorage.setItem("materialluci-mode","dark");localStorage.setItem("materialluci-cards","true");},design);
  await page.goto(origin+"/upstream.html");
  await page.waitForSelector("#ml-appearance-entry");
  await page.waitForFunction(()=>!!document.querySelector('input[id$=".hostname"]')?.closest(".ml-text-field"));
  const settingsText=await page.locator("#ml-appearance").innerText();
  assert.ok(!settingsText.includes("OnePlus"));
  assert.ok(settingsText.includes("MaterialLuCI Classic"));
  // Playwright selectors pierce official Material Web shadow roots. Check
  // form-associated hosts and light-DOM buttons, not their internal buttons.
  assert.equal(await page.evaluate(()=>[...document.querySelectorAll("#ml-appearance button,#ml-appearance md-outlined-button,#ml-appearance md-text-button")].every(n=>n.type==="button")),true);
  assert.equal(await page.locator("#ml-brand-title-color-fields").isVisible(),false);
  await page.locator('.ml-swatch-item[data-seed="#009688"]').click();
  assert.equal(await page.locator('.ml-swatch-item[data-seed="#009688"] .ml-swatch').getAttribute("data-selected"),"true");
  assert.equal(await page.locator('.ml-swatch-item[data-seed="#009688"] .ml-swatch').innerText(),"");
  await page.locator("#ml-brand-toolbar-title").fill("路由器");
  assert.equal(await page.locator("#ml-title").innerText(),"路由器");
  await page.locator("#ml-appearance-entry").scrollIntoViewIfNeeded();
  await page.screenshot({path:"dist/ui-refinement/feedback-"+engine+"-"+design+"-appearance.png",fullPage:true});
  // REAL native JSONMap/GridSection: event wrapper, deletion, save, load, render.
  // No production RPC writes; JSONMap is LuCI's isolated in-memory backend.
  await page.evaluate(async()=>{
   const form=await L.require("form"),ui=await L.require("ui");
   window.fixtureForm=form;window.fixtureUI=ui;
   const m=new form.JSONMap({domain:[{".name":"first",name:"first.example",ip:"192.0.2.1"},{".name":"second",name:"second.example",ip:"192.0.2.2"}]},"Hostnames");
   const s=m.section(form.GridSection,"domain","Host entries");s.addremove=true;s.anonymous=true;s.sortable=true;
   // Native modal constructs a UCI Map; keep that Map on the same isolated JSON backend.
   s.addModalOptions=function(section){section.map.data=this.map.data;};
   const name=s.option(form.Value,"name","Hostname");name.datatype="hostname";name.rmempty=true;
   const ip=s.option(form.Value,"ip","IP address");ip.datatype="ipaddr";ip.rmempty=true;ip.value("192.0.2.1","192.0.2.1 (Long alias)");
   window.nativeMap=m;window.nativeSection=s;window.nativeCalls={remove:[],save:0};
   const remove=m.data.remove.bind(m.data),save=m.data.save.bind(m.data);
   m.data.remove=function(...args){nativeCalls.remove.push(args);return remove(...args);};
   m.data.save=function(...args){nativeCalls.save++;return save(...args);};
   document.getElementById("view").replaceChildren(await m.render());
  });
  await page.waitForSelector('[data-sid=first] .cbi-button-remove');
  await page.locator('[data-sid=first] .cbi-button-remove').click();
  await page.waitForSelector('[data-sid=first]',{state:"detached"});
  assert.equal(await page.locator('[data-sid=second]').count(),1);
  assert.equal(await page.evaluate(()=>nativeMap.data.get("json","first")),undefined);
  assert.equal(await page.evaluate(()=>nativeCalls.remove.length),1);
  assert.equal(await page.evaluate(()=>nativeCalls.save),1);
  await page.evaluate(()=>nativeMap.reset());
  assert.equal(await page.locator('[data-sid=first]').count(),0,"reset must not resurrect deleted section");
  await page.locator(".cbi-section-create .cbi-button-add").click();
  await page.waitForSelector("#modal_overlay>.modal");
  const modal=page.locator("#modal_overlay>.modal");
  await page.locator('#modal_overlay .cbi-value[data-name=name] input[type=text]').fill("third.example");

  await page.evaluate(()=>{
   const field=document.querySelector("#modal_overlay .cbi-value[data-name=ip]");
   const widget=field.querySelector(".cbi-dropdown");
   if(widget){const instance=L.dom.findClassInstance(widget);if(instance?.setValue)instance.setValue("192.0.2.3");}
   const input=field.querySelector("input[type=text]");
   if(input){input.value="192.0.2.3";input.dispatchEvent(new Event("change",{bubbles:true}));}
  });
  const small=await modal.boundingBox();assert.ok(small.height<420,"two-field hostname modal must not reserve 420px");
  await page.screenshot({path:"dist/ui-refinement/feedback-"+engine+"-"+design+"-hostname-modal.png"});
  await page.locator('#modal_overlay .right .cbi-button-positive').click();
  await page.waitForFunction(()=>!document.body.classList.contains("modal-overlay-active"));
  assert.equal(await page.evaluate(()=>nativeMap.data.sections("json","domain").length),2);
  await page.locator('[data-sid=second] .cbi-button-remove').click();
  await page.waitForSelector('[data-sid=second]',{state:"detached"});
  assert.equal(await page.evaluate(()=>nativeCalls.remove.length),2);
  // Lease status: reproduce actual DummyValue label + h4 + polling table shape.
  await page.evaluate(async()=>{
   const form=fixtureForm,m=new form.JSONMap({dnsmasq:{enabled:"1"}},"DHCP / DNS"),s=m.section(form.NamedSection,"dnsmasq","dnsmasq","Server settings");
   s.tab("general","General");s.tab("leases","Static leases");
   const flag=s.taboption("general",form.Flag,"enabled","Enabled");
   const nested=s.taboption("leases",form.SectionValue,"__leases__",form.GridSection,"host",null,"Static lease description");
   nested.subsection.addremove=true;nested.subsection.anonymous=true;nested.subsection.option(form.Value,"name","Hostname");
   for(const [key,id,label]of [["__status__","lease_status_table","Active DHCP leases"],["__status6__","lease6_status_table","Active DHCPv6 leases"]]){
    const opt=s.taboption("leases",form.DummyValue,key,label);
    opt.renderWidget=()=>E([E("h4",label),E("table",{id,class:"table"},[E("tr",{class:"tr"},[E("th","Hostname"),E("th","IP"),E("th","MAC"),E("th","Expires")]),E("tr",{class:"tr"},[E("td","Router"),E("td","192.0.2.1"),E("td","00:11:22:33:44:55"),E("td","12h")])])]);
   }
   window.leaseMap=m;view.replaceChildren(await m.render());
  });
  await page.locator(".cbi-tabmenu li").filter({hasText:"Static leases"}).locator("a").click();
  await page.waitForFunction(()=>document.querySelector("#lease_status_table").closest(".cbi-value").classList.contains("ml-card-surface"));
  for(const id of ["lease_status_table","lease6_status_table"]){
   assert.equal(await page.locator("#"+id).evaluate(n=>getComputedStyle(n.closest(".cbi-value")).display),"block");
   assert.equal(await page.locator("#"+id).evaluate(n=>getComputedStyle(n.closest(".cbi-value-field")).display),"block");
  }
  await page.screenshot({path:"dist/ui-refinement/feedback-"+engine+"-"+design+"-leases.png",fullPage:true});
  // Long compound-menu choices retain native DOM and keyboard behavior.
  await page.evaluate(()=>{
   const row=E("div",{class:"cbi-value"},[E("label",{class:"cbi-value-title"},"Device"),E("div",{class:"cbi-value-field"})]);
   window.longMenu=new fixtureUI.Dropdown("wan",{"wan":"Switch VLAN: eth0.2 (wan, wan6) / long interface alias","lan":"Bridge: br-lan (lan)","other":"Custom / 自定义设备名称"},{optional:true});
   row.lastElementChild.append(longMenu.render());view.append(row);
  });
  const dropdown=page.locator("#view .cbi-value-field>.cbi-dropdown").last();
  await dropdown.scrollIntoViewIfNeeded();await dropdown.focus();await page.keyboard.press("ArrowDown");
  await page.waitForFunction(()=>document.querySelector("#view .cbi-value-field>.cbi-dropdown[open]"));
  const menuWidth=await dropdown.locator("ul.dropdown").evaluate(n=>n.getBoundingClientRect().width);
  assert.ok(menuWidth>=300,"long device menu must not collapse to glyph width");
  await page.keyboard.press("Escape");
  // Native changes DOM nodes are reordered, not copied; callbacks remain original.
  await page.evaluate(()=>{
   fixtureUI.changes.changes={network:[["set","lan","proto","static"]]};fixtureUI.changes.displayChanges();
  });
  await page.waitForFunction(()=>document.querySelector(".uci-dialog>.cbi-section>.right").lastElementChild.classList.contains("cbi-button-positive"));
  const actionClasses=await page.locator(".uci-dialog>.cbi-section>.right>button").evaluateAll(ns=>ns.map(n=>n.className));
  assert.ok(actionClasses[1].includes("cbi-button-reset"));assert.ok(actionClasses[2].includes("cbi-button-positive"));
  const summary=await modal.boundingBox();assert.ok(summary.height<420);
  await page.screenshot({path:"dist/ui-refinement/feedback-"+engine+"-"+design+"-changes.png"});
  await page.evaluate(()=>fixtureUI.hideModal());
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  results.push({engine,design,smallModal:small,changeSummary:summary,menuWidth,deleteCalls:await page.evaluate(()=>nativeCalls),scope:"Actual pinned OpenWrt 21.02 widgets and in-memory JSONMap; no firmware apply/rollback certification"});
  await page.close();
 }}finally{await browser.close();}
}}finally{server.kill();fs.writeFileSync("dist/ui-refinement/user-feedback.json",JSON.stringify(results,null,2));}
console.log(JSON.stringify(results));
