import assert from "node:assert/strict";
export async function verifyToolbar(browser,name,base){
 const page=await browser.newPage();
 await page.goto(base);await page.waitForFunction(()=>window.MaterialLuCI&&document.body.dataset.mlMenus==="ready");
 const seeds=["#42A5F5","#CC6F4E","#E6A545","#7DC22F","#26C6DA","#F06292","#808080","#FFFFFF","#000000","#FFFF00"];
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:900});
  for(const dark of [false,true])for(const colored of [false,true])for(const seed of seeds){
   await page.evaluate(({dark,colored,seed})=>{MaterialAppearance.set("mode",dark?"dark":"light");MaterialAppearance.set("seed",seed);MaterialAppearance.set("toolbar",colored);MaterialAppearance.set("icons",true);},{dark,colored,seed});
   const check=async(minimum)=>page.evaluate(minimum=>{
    const rgb=value=>value.match(/[\d.]+/g).map(Number);
    const composite=(ink,bg)=>{const a=ink[3]??1;return ink.slice(0,3).map((v,i)=>v*a+bg[i]*(1-a));};
    const luminance=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    const contrast=(a,b)=>{a=luminance(a);b=luminance(b);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
    const bar=document.querySelector(".ml-toolbar-inner"),bg=rgb(getComputedStyle(bar).backgroundColor);
    const background=bg[3]===0?rgb(getComputedStyle(document.querySelector(".ml-toolbar")).backgroundColor):bg;
    const title=document.querySelector(".ml-title"),titleStyle=getComputedStyle(title),ink=rgb(titleStyle.color);
    if(contrast(ink,background)<minimum)throw Error("title contrast "+contrast(ink,background));
    for(const el of bar.querySelectorAll("button.ml-icon-button,.ml-poll-action")){
     if(!el.getClientRects().length)continue;
     const s=getComputedStyle(el),foreground=rgb(s.color),stateBackground=composite(rgb(s.backgroundColor),background);
     if(s.color!==titleStyle.color)throw Error("toolbar control ink differs from title: "+s.color);
     if(contrast(foreground,stateBackground)<4.5)throw Error("toolbar control state contrast");
     if(el===document.activeElement&&s.outlineStyle!=="none"&&s.outlineColor!==s.color)throw Error("focus ink differs");
    }
    if(document.querySelector('meta[name="theme-color"]').content!==(document.documentElement.dataset.theme==="dark"?"#121212":"#FAFAFA"))throw Error("browser hint changed to accent");
   },minimum);
   await check(colored?7:4.5);
   if(width===390){
    const button=page.locator("#ml-menu-button");
    await button.hover();await check(colored?7:4.5);
    await button.focus();await check(colored?7:4.5);
    const box=await button.boundingBox();await page.mouse.move(box.x+24,box.y+24);await page.mouse.down();await check(colored?7:4.5);await page.mouse.move(0,890);await page.mouse.up();
    await page.evaluate(()=>document.activeElement?.blur());await page.mouse.move(0,890);
   }
  }
  for(const [seed,dark] of [["#E6A545",false],["#42A5F5",false],["#F06292",true],["#7DC22F",false]]){
   await page.evaluate(({seed,dark})=>{MaterialAppearance.set("seed",seed);MaterialAppearance.set("mode",dark?"dark":"light");MaterialAppearance.set("toolbar",true);},{seed,dark});
   await page.screenshot({path:"dist/previews/toolbar-"+name+"-"+width+"-"+seed.slice(1)+"-"+(dark?"dark":"light")+".png"});
  }
 }
 await page.close();console.log(name+": extracted-IPK toolbar title/control contrast, hover, pressed, focus and neutral browser hints passed");
}
