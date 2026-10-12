import assert from "node:assert/strict";

export async function verifySidebar(browser,engine,base){
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto(base);await page.waitForFunction(()=>document.body.dataset.mlMenus==="ready");
 for(const design of ["classic","m3e"]){
 await page.evaluate(design=>MaterialAppearance.set("design",design),design);await page.reload();await page.waitForFunction(()=>document.body.dataset.mlMenus==="ready");
 await page.evaluate(()=>{
  const host=document.createElement("div");host.className="cbi-value-field";
  const input=document.createElement("input");input.type="checkbox";input.id="switch-hover-probe";host.append(input);
  document.getElementById("maincontent").append(host);
 });
 const switchSelector=design==="classic"?"#switch-hover-probe + .mdc-switch":"#switch-hover-probe + md-switch";
 await page.waitForSelector(switchSelector);
 const switchProbe=page.locator(switchSelector);await switchProbe.hover();
 const switchHover=await switchProbe.evaluate(el=>({mdc:getComputedStyle(el).getPropertyValue("--mdc-switch-unselected-hover-state-layer-opacity").trim(),mdRipple:getComputedStyle(el).getPropertyValue("--md-ripple-hover-opacity").trim(),pseudo:el.querySelector(".mdc-switch__ripple")?getComputedStyle(el.querySelector(".mdc-switch__ripple"),"::before").opacity:null}));
 if(design==="classic"){assert.equal(switchHover.mdc,"0");assert.equal(switchHover.pseudo,"0","classic switch hover layer must be transparent");}
 else assert.equal(switchHover.mdRipple,"0","M3 switch hover layer must be transparent");
 for(const mode of ["light","dark"]){
  await page.evaluate(mode=>MaterialAppearance.set("mode",mode),mode);
  await page.waitForFunction(mode=>document.documentElement.dataset.theme===mode,mode);
  for(const width of [390,1440]){
   await page.setViewportSize({width,height:900});
   if(width<1024)await page.locator("#ml-menu-button").click();
   for(const expanded of [false,true]){
    await page.locator("#ml-menu-tree button.ml-nav-parent").evaluateAll((nodes,expanded)=>{
     for(const node of nodes){node.setAttribute("aria-expanded",String(expanded));document.getElementById(node.getAttribute("aria-controls")).hidden=!expanded;}
    },expanded);
    // Rotation temporarily widens the chevron's painted bounding box.
    await page.waitForFunction(()=>Array.from(document.querySelectorAll(".ml-nav-chevron")).every(el=>el.getAnimations().every(animation=>animation.playState!=="running")));
    const positions=await page.locator("#ml-menu-tree button.ml-nav-parent").evaluateAll(nodes=>nodes.map(button=>{
     const label=button.querySelector(".ml-nav-parent-label"),arrow=button.querySelector(".ml-nav-chevron"),range=document.createRange();
     range.selectNodeContents(label);
     const b=button.getBoundingClientRect(),r=range.getBoundingClientRect(),a=arrow.getBoundingClientRect(),s=getComputedStyle(button);
     return {text:label.textContent,left:r.left,expected:b.left+parseFloat(s.borderLeftWidth)+parseFloat(s.paddingLeft),
      arrowRight:a.right,expectedRight:b.right-parseFloat(s.borderRightWidth)-parseFloat(s.paddingRight)};
    }));
    assert.equal(positions.length,4);
    for(const p of positions){
     assert(Math.abs(p.left-p.expected)<=1,engine+" "+mode+" "+width+" "+p.text+": heading text is not at the left inset");
     assert(Math.abs(p.arrowRight-p.expectedRight)<=1,p.text+": chevron is not at the right inset");
    }
   }
   const first=page.locator("#ml-menu-tree button.ml-nav-parent").first(),url=page.url();
   const rect=await first.boundingBox(),label=await first.locator(".ml-nav-parent-label").boundingBox(),arrow=await first.locator(".ml-nav-chevron").boundingBox();
   await first.click({position:{x:label.x-rect.x+8,y:label.y-rect.y+label.height/2}});assert.equal(await first.getAttribute("aria-expanded"),"false");
   await first.click({position:{x:arrow.x-rect.x+arrow.width/2,y:arrow.y-rect.y+arrow.height/2}});assert.equal(await first.getAttribute("aria-expanded"),"true");
   assert.equal(page.url(),url,"heading and chevron expand without navigation");
   assert.equal(await first.locator(":scope > md-ripple,:scope > .mdc-button__ripple").count(),0,"parent feedback must not merge title and chevron");
   for(const region of [".ml-nav-parent-label",".ml-nav-chevron"])assert.equal(await first.locator(region+" > "+(design==="m3e"?"md-ripple":".ml-nav-region-ink")).count(),1,"each sidebar region needs its own feedback");
   if(width===1440){
    await first.locator(".ml-nav-parent-label").hover();await page.waitForTimeout(160);
    const labelColor=await first.locator(".ml-nav-parent-label").evaluate(el=>getComputedStyle(el).backgroundColor);
    const arrowColor=await first.locator(".ml-nav-chevron").evaluate(el=>getComputedStyle(el).backgroundColor);
    assert.equal(labelColor,"rgba(0, 0, 0, 0)","sidebar title hover must not paint a capsule");
    assert.equal(await first.locator(".ml-nav-parent-label").evaluate(el=>getComputedStyle(el).getPropertyValue("--md-ripple-hover-opacity").trim()),"0","sidebar ripple hover layer must stay clear");
    await first.locator(".ml-nav-chevron").hover();await page.waitForTimeout(160);
    const labelAfter=await first.locator(".ml-nav-parent-label").evaluate(el=>getComputedStyle(el).backgroundColor);
    const arrowAfter=await first.locator(".ml-nav-chevron").evaluate(el=>getComputedStyle(el).backgroundColor);
    assert.equal(labelAfter,"rgba(0, 0, 0, 0)","chevron hover must not paint the title capsule");
    assert.notEqual(labelAfter,arrowAfter,"chevron hover feedback should remain isolated");
   }
   if(engine==="chromium")await page.screenshot({path:"dist/previews/sidebar-"+design+"-"+width+"-"+mode+".png"});
   if(width<1024)await page.locator("#ml-drawer-close").click();
  }
 }
 }
 await page.close();
}
