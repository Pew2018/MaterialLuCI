import assert from "node:assert/strict";

export async function verifySidebar(browser,engine,base){
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto(base);await page.waitForFunction(()=>document.body.dataset.mlMenus==="ready");
 for(const design of ["classic","m3e"]){
 await page.evaluate(design=>MaterialAppearance.set("design",design),design);await page.reload();await page.waitForFunction(()=>document.body.dataset.mlMenus==="ready");
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
   assert.equal(await first.locator(":scope > .mdc-button__ripple").count(),1,"one ripple owns the whole heading");
   if(engine==="chromium")await page.screenshot({path:"dist/previews/sidebar-"+width+"-"+mode+".png"});
   if(width<1024)await page.locator("#ml-drawer-close").click();
  }
 }
 }
 await page.close();
}
