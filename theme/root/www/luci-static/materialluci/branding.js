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
 const prefs={toolbarTitle:normalizeText(read(keys.title,"")),toolbarTitleColor:read(keys.mode,"auto")==="custom"?"custom":"auto",toolbarTitleColorValue:validHex(rawValue)?rawValue.toUpperCase():"#FFFFFF",sidebarNameVisible:read(keys.visible,"true")!=="false",sidebarName:normalizeText(read(keys.name,""))};
 function parse(value){const m=String(value||"").match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);if(m)return [+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]];const h=String(value||"").match(/^#([\da-f]{6})$/i);return h?[parseInt(h[1].slice(0,2),16),parseInt(h[1].slice(2,4),16),parseInt(h[1].slice(4,6),16),1]:null;}
 const lum=rgb=>{const a=rgb.map(v=>{const c=v/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});return .2126*a[0]+.7152*a[1]+.0722*a[2];};
 const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
 function bg(){const el=document.querySelector(".ml-toolbar");if(!el)return null;const c=parse(getComputedStyle(el).backgroundColor);return c&&c[3]>=.99?c:null;}
 function contrastAgainstToolbar(color){const b=bg(),f=parse(color);if(!b||!f)return null;const composed=f.map((v,i)=>i<3?v*f[3]+b[i]*(1-f[3]):1);return ratio(composed,b);}
 function autoColor(el){el.style.removeProperty("color");const foreground=parse(getComputedStyle(el).color),background=bg();if(foreground&&background&&contrastAgainstToolbar(getComputedStyle(el).color)<4.5){el.style.setProperty("color",ratio([0,0,0],background)>=ratio([255,255,255],background)?"#000000":"#FFFFFF");}}
 function apply(){
  const title=document.getElementById("ml-title");
  if(title){const value=prefs.toolbarTitle||"MaterialLuCI";if(title.textContent!==value)title.textContent=value;title.setAttribute("aria-label",value);title.title=prefs.toolbarTitle||"";if(prefs.toolbarTitleColor==="custom"&&validHex(prefs.toolbarTitleColorValue))title.style.setProperty("color",prefs.toolbarTitleColorValue);else autoColor(title);}
  const name=document.getElementById("ml-sidebar-name"),heading=document.getElementById("ml-sidebar-heading");
  if(name){const value=prefs.sidebarName||name.dataset.defaultName||"MaterialLuCI";if(name.textContent!==value)name.textContent=value;name.setAttribute("aria-label",value);name.title=prefs.sidebarName||"";}
  if(heading)heading.dataset.nameHidden=String(!prefs.sidebarNameVisible);
 }
 function set(key,value){
  if(key==="toolbarTitle"){if(typeof value!=="string")return false;prefs.toolbarTitle=normalizeText(value);write(keys.title,prefs.toolbarTitle,true);}
  else if(key==="toolbarTitleColor"){if(value!=="auto"&&value!=="custom")return false;prefs.toolbarTitleColor=value;write(keys.mode,value);}
  else if(key==="toolbarTitleColorValue"){if(!validHex(value))return false;prefs.toolbarTitleColorValue=value.toUpperCase();write(keys.value,prefs.toolbarTitleColorValue);}
  else if(key==="sidebarNameVisible"){if(typeof value!=="boolean")return false;prefs.sidebarNameVisible=value;write(keys.visible,String(value),value);}
  else if(key==="sidebarName"){if(typeof value!=="string")return false;prefs.sidebarName=normalizeText(value);write(keys.name,prefs.sidebarName,true);}
  else return false;
  apply();window.dispatchEvent(new Event("materialluci:branding"));return true;
 }
 window.MaterialBranding={prefs,set,apply,normalizeText,contrastAgainstToolbar};apply();
 document.addEventListener("DOMContentLoaded",apply,{once:true});window.addEventListener("materialluci:appearance",apply);
 const observer=new MutationObserver(apply);observer.observe(document.documentElement,{attributes:true,attributeFilter:["style","data-theme","data-toolbar","data-design"]});
 const toolbar=document.querySelector(".ml-toolbar-inner"),heading=document.getElementById("ml-sidebar-heading"),shellObserver=new MutationObserver(apply);
 if(toolbar)shellObserver.observe(toolbar,{childList:true,subtree:true});if(heading)shellObserver.observe(heading,{childList:true,subtree:true});
 if(window.matchMedia){const q=matchMedia("(prefers-color-scheme: dark)");if(q.addEventListener)q.addEventListener("change",apply);else q.addListener(apply);}
})();
