import fs from "node:fs";
import {chromium} from "playwright";
const names=fs.readdirSync("dist/previews").filter(n=>n.endsWith(".png")&&/upstream-settings|upstream-loading|ipv4-dark-cards-true|wireless-light-cards-true|upstream-realtime-dark|upstream-sidebar|upstream-switch|(?:mdc-textfields|reset-button)-(?:light|dark)|(?:reboot|flash|firewall)-(?:390|1280)-(?:light|dark)/.test(n));
const browser=await chromium.launch();
try{
 for(const engine of ["chromium","webkit"]){
  const chosen=names.filter(n=>n.startsWith(engine)).slice(0,24);
  if(!chosen.length)continue;
  const page=await browser.newPage({viewport:{width:1200,height:Math.ceil(chosen.length/4)*310}});
  await page.setContent('<html><body style="margin:0;background:#eee;font:12px sans-serif;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px">'+chosen.map(n=>'<div style="height:302px;overflow:hidden;background:white"><div style="height:28px;padding:4px;overflow:hidden">'+n+'</div><img style="width:100%;height:272px;object-fit:contain;object-position:top" src="data:image/png;base64,'+fs.readFileSync("dist/previews/"+n).toString("base64")+'"></div>').join('')+'</body></html>');
  await page.locator("img").evaluateAll(xs=>Promise.all(xs.map(x=>x.decode())));
  const bytes=await page.screenshot({type:"jpeg",quality:65,path:"dist/previews/contact-"+engine+".jpg"});
  console.log("PREVIEW_SHEET_"+engine+"="+bytes.toString("base64"));
  await page.close();
  // Focused, legible details are available in logs for visual review as well
  // as the unchanged PNG artifacts; no router data enters these fixtures.
  for(const filename of [
   engine+"-desktop-mdc-textfields-dark.png",
   engine+"-reboot-1280-dark.png",
   engine+"-flash-1280-dark.png",
   engine+"-flash-390-dark.png",
   engine+"-firewall-1280-dark.png"
  ]){
   if(!fs.existsSync("dist/previews/"+filename))continue;
   const detail=await browser.newPage();
   await detail.setContent('<img id="preview" src="data:image/png;base64,'+fs.readFileSync("dist/previews/"+filename).toString("base64")+'">');
   const data=await detail.locator("#preview").evaluate(async img=>{
    await img.decode();const c=document.createElement("canvas");c.width=img.naturalWidth;c.height=img.naturalHeight;
    c.getContext("2d").drawImage(img,0,0);return c.toDataURL("image/jpeg",.75);
   });
   console.log("PREVIEW_DETAIL_"+filename+"="+data);
   await detail.close();
  }
 }
}finally{await browser.close();}
