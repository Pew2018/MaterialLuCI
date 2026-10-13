/* Browser-local title and sidebar preferences only; no LuCI/UCI writes. */
"use strict";
(function(){
 const prefix="materialluci-",limit=64,keys={title:"toolbar-title",mode:"toolbar-title-color",value:"toolbar-title-color-value",visible:"sidebar-name-visible",name:"sidebar-name"};
 const read=(key,fallback)=>{try{const value=localStorage.getItem(prefix+key);return value===null?fallback:value;}catch(_){return fallback;}};
 const write=(key,value,remove=false)=>{try{if(remove)localStorage.removeItem(prefix+key);else localStorage.setItem(prefix+key,value);}catch(_){}};
 const segmenter=typeof Intl!=="undefined"&&Intl.Segmenter?new Intl.Segmenter(undefined,{granularity:"grapheme"}):null;
 const normalizeText=value=>{if(typeof value!=="string")return "";const text=segmenter?[...segmenter.segment(value)].slice(0,limit).map(item=>item.segment).join(""):[...value].slice(0,limit).join("");return text.trim()?text:"";};
 const validHex=value=>typeof value==="string"&&/^#[0-9a-f]{6}$/i.test(value);
 const rawValue=read(keys.value,"#FFFFFF");
 const prefs={toolbarTitle:normalizeText(read(keys.title,"")),toolbarTitleColor:read(keys.mode,"auto")==="custom"&&validHex(rawValue)?"custom":"auto",toolbarTitleColorValue:validHex(rawValue)?rawValue.toUpperCase():"#FFFFFF",sidebarNameVisible:read(keys.visible,"true")!=="false",sidebarName:normalizeText(read(keys.name,""))};
 function parse(value){const m=String(value||"").match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);if(m)return [+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]];const h=String(value||"").match(/^#([\da-f]{6})$/i);return h?[parseInt(h[1].slice(0,2),16),parseInt(h[1].slice(2,4),16),parseInt(h[1].slice(4,6),16),1]:null;}
 const lum=rgb=>{const a=rgb.map(v=>{const c=v/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});return .2126*a[0]+.7152*a[1]+.0722*a[2];};
 const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
 const root=document.documentElement;
 const colorProperties=["--toolbar-surface","--primary-surface","--on-toolbar","--on-primary","--toolbar-ink","--ink","--surface","--md-sys-color-surface","--md-sys-color-on-surface","--md-sys-color-primary"];
 let colorKey="",appearanceKey="",colorTitle=null,frame=0,suspended=false;
 const attr=(el,key,value)=>{if(el.getAttribute(key)!==value)el.setAttribute(key,value);};
 const style=(el,key,value)=>{if(el.style.getPropertyValue(key)!==value){if(value)el.style.setProperty(key,value);else el.style.removeProperty(key);}};
 function snapshot(){
  return [root.dataset.theme,root.dataset.toolbar,root.dataset.design,...colorProperties.map(key=>root.style.getPropertyValue(key))].join("|");
 }
 function paint(){
  const toolbar=document.querySelector(".ml-toolbar"),inner=toolbar?.querySelector(".ml-toolbar-inner");
  if(!toolbar)return {};
  // Read each painted element once; natural title ink comes from the actual
  // theme token used by cascade.css, independent of our inline override.
  const outerStyle=getComputedStyle(toolbar),innerStyle=inner?getComputedStyle(inner):outerStyle;
  const inside=parse(innerStyle.backgroundColor),outside=parse(outerStyle.backgroundColor);
  return {background:inside&&inside[3]>=.99?inside:outside&&outside[3]>=.99?outside:null,
   foreground:parse(innerStyle.getPropertyValue("--toolbar-ink").trim()||innerStyle.color)};
 }
 function contrast(color,background){
  const foreground=parse(color);if(!background||!foreground)return null;
  return ratio(foreground.slice(0,3).map((v,i)=>v*foreground[3]+background[i]*(1-foreground[3])),background);
 }
 function contrastAgainstToolbar(color){return contrast(color,paint().background);}
 function titleContent(){
  const title=document.getElementById("ml-title");
  if(title){const value=prefs.toolbarTitle||"MaterialLuCI";if(title.textContent!==value)title.textContent=value;attr(title,"aria-label",value);attr(title,"title",prefs.toolbarTitle||"");}
 }
 function nameContent(){
  const name=document.getElementById("ml-sidebar-name"),heading=document.getElementById("ml-sidebar-heading");
  if(name){const value=prefs.sidebarName||name.dataset.defaultName||"MaterialLuCI";if(name.textContent!==value)name.textContent=value;attr(name,"aria-label",value);attr(name,"title",prefs.sidebarName||"");}
  if(heading)attr(heading,"data-name-hidden",String(!prefs.sidebarNameVisible));
 }
 function color(){
  const title=document.getElementById("ml-title");if(!title)return;
  const appearance=snapshot(),key=appearance+"|"+prefs.toolbarTitleColor+"|"+prefs.toolbarTitleColorValue;
  if(title===colorTitle&&key===colorKey)return;
  colorTitle=title;colorKey=key;appearanceKey=appearance;
  if(prefs.toolbarTitleColor==="custom"){style(title,"color",prefs.toolbarTitleColorValue);return;}
  const {foreground,background}=paint();
  const score=foreground&&background?contrast("rgba("+foreground.join(",")+")",background):null;
  const value=score!==null&&score<4.5?(ratio([0,0,0],background)>=ratio([255,255,255],background)?"#000000":"#FFFFFF"):"";
  style(title,"color",value);
 }
 function apply(){titleContent();nameContent();color();}
 function queueColor(){if(!suspended&&!frame)frame=requestAnimationFrame(()=>{frame=0;color();});}
 function set(key,value){
  if(key==="toolbarTitle"){if(typeof value!=="string")return false;prefs.toolbarTitle=normalizeText(value);write(keys.title,prefs.toolbarTitle,!prefs.toolbarTitle);}
  else if(key==="toolbarTitleColor"){if(value!=="auto"&&value!=="custom")return false;prefs.toolbarTitleColor=value;write(keys.mode,value);}
  else if(key==="toolbarTitleColorValue"){if(!validHex(value))return false;prefs.toolbarTitleColorValue=value.toUpperCase();write(keys.value,prefs.toolbarTitleColorValue);}
  else if(key==="sidebarNameVisible"){if(typeof value!=="boolean")return false;prefs.sidebarNameVisible=value;write(keys.visible,String(value),value);}
  else if(key==="sidebarName"){if(typeof value!=="string")return false;prefs.sidebarName=normalizeText(value);write(keys.name,prefs.sidebarName,!prefs.sidebarName);}
  else return false;
  if(key==="toolbarTitle")titleContent();else if(key==="sidebarName"||key==="sidebarNameVisible")nameContent();else color();window.dispatchEvent(new Event("materialluci:branding"));return true;
 }
 window.MaterialBranding={prefs,set,apply,normalizeText,contrastAgainstToolbar};apply();
 document.addEventListener("DOMContentLoaded",apply,{once:true});
 window.addEventListener("materialluci:appearance",queueColor);
 const observer=new MutationObserver(()=>{if(snapshot()!==appearanceKey)queueColor();});
 const shellObserver=new MutationObserver(records=>{
  // Ignore indicator text, ripple and progress updates in the toolbar subtree.
  const relevant=n=>n.nodeType===1&&(n.matches?.("#ml-title,#ml-sidebar-name,#ml-sidebar-heading")||n.querySelector?.("#ml-title,#ml-sidebar-name,#ml-sidebar-heading"));
  if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(relevant)))apply();
 });
 function observe(){
  observer.observe(root,{attributes:true,attributeFilter:["style","data-theme","data-toolbar","data-design"]});
  const toolbar=document.querySelector(".ml-toolbar"),heading=document.getElementById("ml-sidebar-heading");
  if(toolbar)shellObserver.observe(toolbar,{childList:true,subtree:true});
  if(heading?.parentElement)shellObserver.observe(heading.parentElement,{childList:true,subtree:true});
 }
 // Toolbar-local background changes are rare but meaningful. Only direct
 // toolbar/inner attributes qualify; title's own color never loops back.
 const backgroundObserver=new MutationObserver(records=>{if(records.some(r=>r.target.matches(".ml-toolbar,.ml-toolbar-inner"))) {colorKey="";queueColor();}});
 const toolbar=document.querySelector(".ml-toolbar");
 if(toolbar)backgroundObserver.observe(toolbar,{attributes:true,subtree:true,attributeFilter:["style","class"]});
 observe();
 window.addEventListener("pagehide",event=>{
  suspended=true;cancelAnimationFrame(frame);frame=0;
  if(!event.persisted){observer.disconnect();shellObserver.disconnect();backgroundObserver.disconnect();}
 });
 window.addEventListener("pageshow",event=>{if(event.persisted){suspended=false;colorKey="";apply();}});
})();
