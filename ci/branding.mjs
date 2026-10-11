import assert from "node:assert/strict";
const contrast=page=>page.locator("#ml-title").evaluate(el=>{
 const rgb=v=>{const m=v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);return m?[+m[1],+m[2],+m[3]]:null;};
 const lum=a=>a.reduce((s,v,i)=>{const c=v/255;return s+(c<=.04045?c/12.92:((c+.055)/1.055)**2.4)*[.2126,.7152,.0722][i];},0);
 const inner=getComputedStyle(document.querySelector(".ml-toolbar-inner")).backgroundColor;
 const f=rgb(getComputedStyle(el).color),b=rgb(inner==="rgba(0, 0, 0, 0)"?getComputedStyle(document.querySelector(".ml-toolbar")).backgroundColor:inner);
 if(!f||!b)return null;const x=lum(f),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
});
export async function verifyBranding(browser,engine,base){
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(base);await page.waitForSelector("#ml-appearance-entry");await page.waitForSelector("#ml-brand-sidebar-visible");
 assert.equal(await page.locator("#ml-title").textContent(),"MaterialLuCI");
 const hostname=await page.locator("#ml-sidebar-name").getAttribute("data-default-name");assert(hostname);assert.equal(await page.locator("#ml-sidebar-name").textContent(),hostname);
 assert.equal(await page.locator("#ml-sidebar-heading").getAttribute("data-name-hidden"),"false");
 assert.equal(await page.locator("#ml-appearance [name]").count(),0,"browser preferences stay outside form data");
 assert.equal(await page.locator("#ml-appearance button").evaluateAll(list=>list.every(b=>b.type==="button")),true,"all appearance buttons avoid form submission");
 const title=page.locator("#ml-brand-toolbar-title");await page.locator("#fixture-name").fill("Unapplied draft");await title.fill("路由器 Home 🛰️ 🚀");assert.equal(await page.locator("#ml-title").textContent(),"路由器 Home 🛰️ 🚀");
 const color=page.locator("#ml-brand-title-color-text");await page.locator("#ml-brand-title-color-mode").selectOption("custom");await color.fill("#FFD166");
 assert.equal((await page.locator("#ml-brand-title-color-picker").inputValue()).toUpperCase(),"#FFD166");
 const applied=await page.locator("#ml-title").evaluate(el=>getComputedStyle(el).color);
 await color.fill("#12");assert.equal(await color.getAttribute("aria-invalid"),"true");assert.match(await page.locator("#ml-brand-title-color-error").textContent(),/RRGGBB|HEX/);
 assert.equal(await page.locator("#ml-title").evaluate(el=>getComputedStyle(el).color),applied,"invalid color does not replace last valid value");
 await page.locator("#ml-brand-title-color-picker").evaluate(el=>{el.value="#21a0db";el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));});assert.equal((await color.inputValue()).toUpperCase(),"#21A0DB");
 await page.locator("#ml-brand-title-color-mode").selectOption("auto");await page.evaluate(()=>MaterialAppearance.set("mode","dark"));await page.waitForFunction(()=>document.documentElement.dataset.theme==="dark");
 const ratio=await contrast(page);assert(ratio===null||ratio>=4.5,"automatic title contrast "+ratio);
 await title.fill("😀".repeat(70));await title.blur();const capped=await page.locator("#ml-title").textContent();assert.equal(Array.from(capped).length,64);assert.equal(await page.locator("#ml-title").getAttribute("aria-label"),capped);
 await title.fill("<img src=x onerror=window.brandXss=1>");assert.equal(await page.locator("#ml-title").textContent(),"<img src=x onerror=window.brandXss=1>");assert.equal(await page.locator("#ml-title img").count(),0);assert.equal(await page.evaluate(()=>window.brandXss||0),0);
 await title.fill("   ");assert.equal(await page.locator("#ml-title").textContent(),"MaterialLuCI");
 assert.equal(await page.locator("#fixture-name").inputValue(),"Unapplied draft","appearance preferences preserve an unsaved page draft");
 await title.fill("中文 composition 测试");await page.reload();await page.waitForSelector("#ml-brand-toolbar-title");assert.equal(await page.locator("#ml-title").textContent(),"中文 composition 测试");
 await page.locator("#fixture-name").fill("Unapplied draft");
 await page.locator("#ml-brand-toolbar-title").evaluate(el=>{el.focus();el.value="";el.dispatchEvent(new CompositionEvent("compositionstart",{bubbles:true}));el.value="拼音输入中";el.dispatchEvent(new InputEvent("input",{bubbles:true,inputType:"insertCompositionText",data:"拼音输入中",isComposing:true}));});
 assert.equal(await page.locator("#ml-brand-toolbar-title").inputValue(),"拼音输入中");assert.equal(await page.locator("#ml-title").textContent(),"中文 composition 测试");
 await page.locator("#ml-brand-toolbar-title").evaluate(el=>el.dispatchEvent(new CompositionEvent("compositionend",{bubbles:true,data:"拼音输入中"})));await page.waitForFunction(()=>document.querySelector("#ml-title").textContent==="拼音输入中");
 assert.equal(await page.locator("#fixture-name").inputValue(),"Unapplied draft","appearance preferences preserve an unsaved page draft");await page.locator("#ml-brand-toolbar-title").press("Enter");assert.equal(await page.evaluate(()=>window.fixtureSubmissions||0),0,"Enter does not submit the LuCI form");
 const name=page.locator("#ml-brand-sidebar-name");await name.fill("旅行路由器 🏠");assert.equal(await page.locator("#ml-sidebar-name").textContent(),"旅行路由器 🏠");
 await name.fill("  ");assert.equal(await page.locator("#ml-sidebar-name").textContent(),hostname);
 await name.fill("Patrick Home");await page.reload();await page.waitForSelector("#ml-brand-sidebar-name");assert.equal(await page.locator("#ml-sidebar-name").textContent(),"Patrick Home");
 const visible=page.locator("#ml-brand-sidebar-visible"),visibleControl=visible.locator("xpath=..").locator(".mdc-switch,md-switch").first();await visibleControl.click();assert.equal(await page.locator("#ml-sidebar-heading").getAttribute("data-name-hidden"),"true");assert.equal(await name.isDisabled(),true);
 await page.setViewportSize({width:390,height:844});await page.locator("#ml-menu-button").click();await page.locator("#ml-drawer-close").waitFor({state:"visible"});
 if(engine==="chromium")await page.screenshot({path:"dist/previews/branding-mobile-hidden-device-name.png"});
 await page.locator("#ml-drawer-close").click();assert.equal(await page.locator("#ml-menu-button").getAttribute("aria-expanded"),"false");await visibleControl.click();assert.equal(await page.locator("#ml-sidebar-name").textContent(),"Patrick Home");
 await page.evaluate(()=>{MaterialAppearance.set("mode","light");MaterialAppearance.set("toolbar",true);});
 await page.locator("#ml-brand-title-color-mode").selectOption("custom");await page.locator("#ml-brand-title-color-text").fill("#FF00AA");await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>scrollTo(0,0));
 if(engine==="chromium")await page.screenshot({path:"dist/previews/branding-desktop-light-settings.png",fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.locator("#ml-brand-toolbar-title").fill("这是一个很长的中文顶栏标题，用来确认单行省略不会挤压菜单和状态指示器 🚀");
 await page.evaluate(()=>{MaterialAppearance.set("mode","dark");MaterialAppearance.set("toolbar",true);});await page.locator("#ml-brand-title-color-mode").selectOption("custom");await page.locator("#ml-brand-title-color-text").fill("#FFD166");await page.evaluate(()=>scrollTo(0,0));
 assert.equal(await page.locator(".ml-toolbar").evaluate(el=>el.getBoundingClientRect().height),64);
 if(engine==="chromium")await page.screenshot({path:"dist/previews/branding-mobile-dark-custom-title.png"});
 await page.locator("#ml-brand-sidebar-name").fill("旅行设备");await page.locator("#ml-brand-title-color-text").fill("#12");
 if(engine==="chromium")await page.screenshot({path:"dist/previews/branding-dark-custom-name-invalid-color.png",fullPage:true});
 if(await page.evaluate(()=>Object.hasOwn(MaterialAppearance.prefs,"design"))){
  await page.evaluate(()=>MaterialAppearance.set("design","classic"));await page.reload();await page.waitForSelector("#ml-brand-toolbar-title");assert.equal(await page.locator("html").getAttribute("data-design"),"classic");
  if(engine==="chromium")await page.screenshot({path:"dist/previews/branding-m3e-branch-classic-style.png",fullPage:true});
  await page.evaluate(()=>MaterialAppearance.set("design","m3e"));await page.reload();await page.waitForSelector("#ml-brand-toolbar-title");assert.equal(await page.locator("html").getAttribute("data-design"),"m3e");
  assert.equal(await page.locator("#ml-title").textContent(),"这是一个很长的中文顶栏标题，用来确认单行省略不会挤压菜单和状态指示器 🚀");
  if(engine==="chromium")await page.screenshot({path:"dist/previews/branding-m3e-branch-m3e-style.png",fullPage:true});
 }
 const canCorrupt=await page.evaluate(()=>{try{localStorage.setItem("materialluci-toolbar-title","<bad");localStorage.setItem("materialluci-toolbar-title-color","custom");localStorage.setItem("materialluci-toolbar-title-color-value","bad");localStorage.setItem("materialluci-sidebar-name-visible","invalid");localStorage.setItem("materialluci-sidebar-name","\ud800");return true;}catch(_){return false;}});
 if(canCorrupt){await page.reload();await page.waitForSelector("#ml-brand-toolbar-title");assert.equal(await page.locator("#ml-title").textContent(),"<bad","stored titles remain literal text");assert.equal(await page.locator("#ml-title").locator("*").count(),0);assert.equal(await page.locator("#ml-brand-title-color-mode").inputValue(),"auto");assert.equal(await page.locator("#ml-sidebar-heading").getAttribute("data-name-hidden"),"false");}
 const storageUnavailable=await page.evaluate(()=>{try{Object.defineProperty(window,"localStorage",{configurable:true,get(){throw Error("blocked");}});return MaterialBranding.set("toolbarTitle","Memory only");}catch(_){return false;}});assert.equal(storageUnavailable,true,"localStorage failures are tolerated");
 assert.equal(errors.length,0,"browser errors: "+errors.join("\n"));await page.close();
}
