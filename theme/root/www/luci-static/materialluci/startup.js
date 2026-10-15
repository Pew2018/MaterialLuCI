/* MaterialLuCI Classic Native. Appearance only; no router writes. */
"use strict";
(function(){
 const root=document.documentElement, query=matchMedia("(prefers-color-scheme: dark)");
 const get=(key,fallback)=>{try{return localStorage.getItem("materialluci-"+key)||fallback;}catch(_){return fallback;}};
 const prefs={design:get("design","m3e"),mode:get("mode","system"),seed:get("seed","#42A5F5"),cards:get("cards","true")==="true",toolbar:get("toolbar","false")==="true",categories:get("categories","false")==="true",icons:get("icons","false")==="true"};
 if(!["system","light","dark"].includes(prefs.mode)) prefs.mode="system";
 if(!/^#[0-9a-f]{6}$/i.test(prefs.seed)) prefs.seed="#42A5F5";
 prefs.seed=prefs.seed.toUpperCase();
 if(!["classic","m3e"].includes(prefs.design))prefs.design="classic";
 // Honor the chosen design. M3E no longer silently drops to Classic when the M3
 // color asset is slow or unsupported on a given browser: it keeps the M3
 // shape/layout and applies a graceful color fallback, then upgrades to the full
 // M3 palette once the asset becomes available.
 const activeDesign=prefs.design;
 root.dataset.design=activeDesign;root.dataset.requestedDesign=prefs.design;
 let m3Fallback=false;
 function apply(){
  const dark=prefs.mode==="dark"||(prefs.mode==="system"&&query.matches);
  const m3=activeDesign==="m3e"&&window.MaterialM3Palette?window.MaterialM3Palette.generate(prefs.seed,dark):null;
  const p=m3?m3.legacy:MaterialPalette.generate(prefs.seed,dark);
  if(m3){
   for(const [key,color] of Object.entries(m3.system))root.style.setProperty("--md-sys-color-"+key.replace(/[A-Z]/g,c=>"-"+c.toLowerCase()),color);
   for(const [key,color] of Object.entries(m3.surfaces))root.style.setProperty("--"+key,color);
   m3Fallback=false;
  }else if(activeDesign==="m3e"){
   applyM3FallbackColors(p,dark);m3Fallback=true;scheduleM3Retry();
  }
  root.dataset.theme=dark?"dark":"light";root.dataset.cards=String(prefs.cards);
  root.dataset.toolbar=String(prefs.toolbar);root.dataset.categories=String(prefs.categories);root.dataset.icons=String(prefs.icons);
  root.style.colorScheme=dark?"dark":"light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content",dark?"#121212":"#FAFAFA");
  root.style.setProperty("--browser-surface",dark?"#121212":"#FAFAFA");
  const mapping={toolbarSurface:"toolbar-surface",onToolbar:"on-toolbar",toolbarHover:"toolbar-hover",toolbarPressed:"toolbar-pressed",seed:"seed",primarySurface:"primary-surface",onPrimary:"on-primary",primaryPressed:"primary-pressed",accentInk:"accent-ink",controlAccent:"control-accent",controlStrong:"control-strong",actionPrimary:"action-fill",onActionPrimary:"on-accent",actionPrimaryPressed:"action-pressed",actionSecondary:"action-tonal",onActionSecondary:"on-action-tonal",actionSecondaryPressed:"tonal-pressed",switchThumb:"switch-thumb",switchTrack:"switch-track",navIcon:"nav-icon",navLabel:"nav-label",swatchForeground:"swatch-foreground"};
  for(const [key,css] of Object.entries(mapping)) root.style.setProperty("--"+css,p[key]);
  root.dataset.designFallback=String(m3Fallback);
 }
 // Map the Classic palette to the M3 system tokens so M3E controls stay styled
 // even before/without the M3 color asset.
 function applyM3FallbackColors(p,dark){
  const set=(k,v)=>root.style.setProperty(k,v);
  set("--md-sys-color-primary",p.primarySurface);
  set("--md-sys-color-on-primary",p.onPrimary);
  set("--md-sys-color-primary-container",p.primarySurface);
  set("--md-sys-color-on-primary-container",p.onPrimary);
  set("--md-sys-color-secondary",p.actionSecondary);
  set("--md-sys-color-on-secondary",p.onActionSecondary);
  set("--md-sys-color-secondary-container",p.actionSecondary);
  set("--md-sys-color-on-secondary-container",p.onActionSecondary);
  set("--md-sys-color-surface",dark?"#121212":"#ffffff");
  set("--md-sys-color-on-surface",dark?"#e6e1e5":"#1c1b1f");
  set("--md-sys-color-surface-variant",dark?"#49454f":"#e7e0ec");
  set("--md-sys-color-on-surface-variant",p.muted||(dark?"#cac4d0":"#49454f"));
  set("--md-sys-color-outline",dark?"#938f99":"#79747e");
  set("--md-sys-color-outline-variant",p.divider||(dark?"#49454f":"#cac4d0"));
  set("--md-sys-color-surface-container-lowest",dark?"#0e0e0e":"#fbf8fc");
  set("--md-sys-color-surface-container-low",dark?"#1a1a1c":"#f7f2fa");
  set("--md-sys-color-surface-container",dark?"#1f1f21":"#f3edf7");
  set("--md-sys-color-surface-container-high",dark?"#242427":"#ece6f4");
  set("--md-sys-color-surface-container-highest",dark?"#2e2e31":"#e6e0ea");
  set("--md-sys-color-inverse-surface",dark?"#e6e1e5":"#313033");
  set("--md-sys-color-inverse-on-surface",dark?"#313033":"#f4eff4");
  set("--md-sys-color-inverse-primary",p.actionPrimary);
  set("--md-sys-color-error",p.danger||"#b3261e");
  set("--md-sys-color-on-error","#ffffff");
  set("--md-sys-color-error-container",dark?"#410e0b":"#f9dedc");
  set("--md-sys-color-on-error-container",dark?"#f9dedc":"#410e0b");
  set("--page",dark?"#121212":"#fafafa");
  set("--surface",dark?"#1e1e1e":"#ffffff");
  set("--card",dark?"#1e1e1e":"#fafafa");
  set("--ink",p.accentInk||(dark?"#e6e1e5":"#1c1b1f"));
  set("--muted",p.controlAccent||(dark?"#cac4d0":"#49454f"));
  set("--divider",p.divider||(dark?"#3a3a3c":"#e0e0e0"));
  set("--disabled",dark?"#5a5a5e":"#9a9a9e");
  set("--pressed",dark?"#2a2a2d":"#ececec");
  set("--raised-surface",dark?"#242427":"#ece6f4");
  set("--inset-surface",dark?"#0e0e0e":"#fbf8fc");
  set("--sidebar-surface",dark?"#1e1e1e":"#ffffff");
  set("--status-surface",dark?"#1f1f21":"#f3edf7");
  set("--log",dark?"#242427":"#ece6f4");
 }
 let retryTimer=null,retryCount=0;
 function scheduleM3Retry(){
  if(retryTimer||retryCount>=20)return;
  retryTimer=setTimeout(()=>{retryTimer=null;retryCount++;
   if(activeDesign==="m3e"&&window.MaterialM3Palette){apply();}
   else if(retryCount<20){scheduleM3Retry();}
  },150);
 }
 const api={prefs,activeDesign,apply,set(key,value){if(!(key in prefs))return;if(key==="seed"&&!/^#[0-9a-f]{6}$/i.test(value))return;if(key==="mode"&&!["system","light","dark"].includes(value))return;if(key==="design"&&!["classic","m3e"].includes(value))return;prefs[key]=key==="seed"?value.toUpperCase():value;try{localStorage.setItem("materialluci-"+key,String(prefs[key]));}catch(_){}if(key!=="design")apply();window.dispatchEvent(new Event("materialluci:appearance"));}};
 window.MaterialAppearance=api;apply();
 if(query.addEventListener)query.addEventListener("change",()=>{if(prefs.mode==="system")apply();});else query.addListener(()=>{if(prefs.mode==="system")apply();});
 window.setTimeout(()=>{if(!window.MaterialLuCI){root.dataset.startupError="true";const e=document.getElementById("ml-startup-error");if(e)e.hidden=false;}},10000);
})();
