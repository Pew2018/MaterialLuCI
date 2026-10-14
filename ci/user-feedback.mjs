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
  assert.deepEqual(await page.locator("[data-design-option]").evaluateAll(ns=>ns.map(n=>n.textContent.trim())),["Classic","M3E"]);
  const other=design==="classic"?"m3e":"classic";
  await page.locator('[data-design-option="'+other+'"]').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem("materialluci-design")),other);
  assert.equal(await page.evaluate(()=>MaterialAppearance.activeDesign),design,"style applies on next full load");
  await page.locator('[data-design-option="'+design+'"]').click();
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
   assert.equal(await page.locator("#"+id).evaluate(n=>{const value=n.closest(".cbi-value"),field=n.closest(".cbi-value-field"),s=getComputedStyle(value);return Math.abs(field.getBoundingClientRect().width-(value.getBoundingClientRect().width-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)))<1;}),true,"lease table fills its card content width");
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
  // Real LuCI ComboButton internals, native selection event and portal hit test.
  for(const width of [1280,390])for(const theme of ["light","dark"])for(const count of [2,60]){
   await page.setViewportSize({width,height:width===390?844:900});
   await page.evaluate(({theme,count})=>{
    MaterialAppearance.set("mode",theme);
    fixtureUI.changes.changes={network:Array.from({length:count},(_,i)=>["set","lan","value"+i,"设备 "+i+" long configuration value"])};
    fixtureUI.changes.displayChanges();
    const panel=document.querySelector("#modal_overlay>.modal"),old=panel.querySelector(".right");
    window.comboCalls=[];window.comboUndo=0;
    window.nativeCombo=new fixtureUI.ComboButton("0",{"0":"Save & Apply","1":"Apply unchecked"},{
     classes:{"0":"btn cbi-button cbi-button-positive important","1":"btn cbi-button cbi-button-negative important"},
     click(ev,mode){comboCalls.push(mode);}
    });
    const close=E("button",{class:"btn cbi-button",click:()=>fixtureUI.hideModal()},"Close");
    const undo=E("button",{class:"btn cbi-button cbi-button-reset",click:()=>comboUndo++},"Revert");
    const actions=E("div",{class:"button-row"},[close,nativeCombo.render(),undo]);old.replaceWith(actions);
    window.comboChildren=[...nativeCombo.node.childNodes];
   },{theme,count});
   await page.waitForFunction(()=>document.querySelector(".ml-changes-dialog .button-row").lastElementChild.classList.contains("cbi-dropdown"));
   const combo=page.locator(".ml-changes-dialog .button-row>.cbi-dropdown");
   assert.equal(await page.evaluate(()=>comboChildren.slice(0,-1).every((n,i)=>nativeCombo.node.childNodes[i]===n)&&nativeCombo.node.lastElementChild===comboChildren[comboChildren.length-1]),true,"theme preserves native prefix indices and lastElementChild value container");
   await combo.scrollIntoViewIfNeeded();
   await combo.click({position:{x:30,y:24}});
   assert.deepEqual(await page.evaluate(()=>comboCalls),["0"],"default native action runs once");
   await combo.locator(":scope > .open").click();
   await page.waitForFunction(()=>document.querySelector(".ml-action-menu.mdc-menu-surface--open"));
   const unchecked=page.locator(".ml-action-menu.mdc-menu-surface--open [data-value='1']");
   await unchecked.waitFor({state:"visible"});
   assert.ok(await unchecked.evaluate(n=>{const r=n.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return n.contains(hit);}),"portal option is not clipped or covered");
   await page.screenshot({path:"dist/ui-refinement/native-combo-"+engine+"-"+design+"-"+theme+"-"+width+"-"+count+".png"});
   await unchecked.click();
   assert.equal(await page.evaluate(()=>nativeCombo.getValue()),"1");
   assert.deepEqual(await page.evaluate(()=>comboCalls),["0"],"choosing mode does not prematurely apply");
   await combo.click({position:{x:30,y:24}});
   assert.deepEqual(await page.evaluate(()=>comboCalls),["0","1"]);
   await page.locator(".ml-changes-dialog .button-row>.cbi-button-reset").click();
   assert.equal(await page.evaluate(()=>comboUndo),1);
   // Native toggleItem deliberately rebuilds preview/hidden values. Verify the
   // stable native arrow rather than forbidding LuCI\'s own DOM update.
   assert.equal(await combo.locator(":scope > .open").count(),1);
   await page.locator(".ml-changes-dialog .button-row>button").first().click();
   await page.waitForFunction(()=>!document.body.classList.contains("modal-overlay-active"));
   assert.equal(await page.locator(".ml-changes-dialog").count(),0);
  }
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  results.push({engine,design,smallModal:small,changeSummary:summary,menuWidth,deleteCalls:await page.evaluate(()=>nativeCalls),scope:"Actual pinned OpenWrt 21.02 widgets and in-memory JSONMap; no firmware apply/rollback certification"});
  await page.close();
 }}finally{await browser.close();}
}}finally{server.kill();fs.writeFileSync("dist/ui-refinement/user-feedback.json",JSON.stringify(results,null,2));}
console.log(JSON.stringify(results));
