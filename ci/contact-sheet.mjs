import fs from "node:fs";
import {chromium} from "playwright";
const names=fs.readdirSync("dist/previews").filter(n=>n.endsWith(".png")&&/upstream-settings|upstream-loading|ipv4-dark-cards-true|wireless-light-cards-true|upstream-realtime-dark|upstream-sidebar|upstream-switch|mdc-textfields|reset-button/.test(n));
const browser=await chromium.launch();
try{
 for(const engine of ["chromium","webkit"]){
  const chosen=names.filter(n=>n.startsWith(engine)).slice(0,18);
  if(!chosen.length)continue;
  const page=await browser.newPage({viewport:{width:1200,height:Math.ceil(chosen.length/4)*310}});
  await page.setContent('<html><body style="margin:0;background:#eee;font:12px sans-serif;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px">'+chosen.map(n=>'<div style="height:302px;overflow:hidden;background:white"><div style="height:28px;padding:4px;overflow:hidden">'+n+'</div><img style="width:100%;height:272px;object-fit:contain;object-position:top" src="data:image/png;base64,'+fs.readFileSync("dist/previews/"+n).toString("base64")+'"></div>').join('')+'</body></html>');
  await page.locator("img").evaluateAll(xs=>Promise.all(xs.map(x=>x.decode())));
  const bytes=await page.screenshot({type:"jpeg",quality:65,path:"dist/previews/contact-"+engine+".jpg"});
  console.log("PREVIEW_SHEET_"+engine+"="+bytes.toString("base64"));
  await page.close();
 }
}finally{await browser.close();}
