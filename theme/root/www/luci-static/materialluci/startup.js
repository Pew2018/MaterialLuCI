/* MaterialLuCI Classic Native. Appearance only; no router writes. */
"use strict";
(function(){
 const root=document.documentElement, query=matchMedia("(prefers-color-scheme: dark)");
 const get=(key,fallback)=>{try{return localStorage.getItem("materialluci-"+key)||fallback;}catch(_){return fallback;}};
 const prefs={design:get("design","classic"),mode:get("mode","system"),seed:get("seed","#42A5F5"),cards:get("cards","true")==="true",toolbar:get("toolbar","false")==="true",categories:get("categories","false")==="true",icons:get("icons","false")==="true"};
 if(!["system","light","dark"].includes(prefs.mode)) prefs.mode="system";
 if(!/^#[0-9a-f]{6}$/i.test(prefs.seed)) prefs.seed="#42A5F5";
 prefs.seed=prefs.seed.toUpperCase();
 if(!["classic","m3e"].includes(prefs.design))prefs.design="classic";
 const activeDesign=prefs.design==="m3e"&&!window.MaterialM3Palette?"classic":prefs.design;root.dataset.design=activeDesign;
 function apply(){
  const dark=prefs.mode==="dark"||(prefs.mode==="system"&&query.matches),m3=activeDesign==="m3e"&&window.MaterialM3Palette?.generate(prefs.seed,dark),p=m3?m3.legacy:MaterialPalette.generate(prefs.seed,dark);
  if(m3){for(const [key,color] of Object.entries(m3.system))root.style.setProperty("--md-sys-color-"+key.replace(/[A-Z]/g,c=>"-"+c.toLowerCase()),color);for(const [key,color] of Object.entries(m3.surfaces))root.style.setProperty("--"+key,color);}
  root.dataset.theme=dark?"dark":"light";root.dataset.cards=String(prefs.cards);
  root.dataset.toolbar=String(prefs.toolbar);root.dataset.categories=String(prefs.categories);root.dataset.icons=String(prefs.icons);
  root.style.colorScheme=dark?"dark":"light";
  // A single unconditional hint follows the chosen page mode, never the seed.
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content",dark?"#121212":"#FAFAFA");
  root.style.setProperty("--browser-surface",dark?"#121212":"#FAFAFA");
  const mapping={toolbarSurface:"toolbar-surface",onToolbar:"on-toolbar",toolbarHover:"toolbar-hover",toolbarPressed:"toolbar-pressed",seed:"seed",primarySurface:"primary-surface",onPrimary:"on-primary",primaryPressed:"primary-pressed",accentInk:"accent-ink",controlAccent:"control-accent",controlStrong:"control-strong",actionPrimary:"action-fill",onActionPrimary:"on-accent",actionPrimaryPressed:"action-pressed",actionSecondary:"action-tonal",onActionSecondary:"on-action-tonal",actionSecondaryPressed:"tonal-pressed",switchThumb:"switch-thumb",switchTrack:"switch-track",navIcon:"nav-icon",navLabel:"nav-label",swatchForeground:"swatch-foreground"};
  for(const [key,css] of Object.entries(mapping)) root.style.setProperty("--"+css,p[key]);
 }
 const api={prefs,activeDesign,apply,set(key,value){if(!(key in prefs))return;if(key==="seed"&&!/^#[0-9a-f]{6}$/i.test(value))return;if(key==="mode"&&!["system","light","dark"].includes(value))return;if(key==="design"&&!["classic","m3e"].includes(value))return;prefs[key]=key==="seed"?value.toUpperCase():value;try{localStorage.setItem("materialluci-"+key,String(prefs[key]));}catch(_){}if(key!=="design")apply();window.dispatchEvent(new Event("materialluci:appearance"));}};
 window.MaterialAppearance=api;apply();
 if(query.addEventListener)query.addEventListener("change",()=>{if(prefs.mode==="system")apply();});else query.addListener(()=>{if(prefs.mode==="system")apply();});
 window.setTimeout(()=>{if(!window.MaterialLuCI){root.dataset.startupError="true";const e=document.getElementById("ml-startup-error");if(e)e.hidden=false;}},10000);
})();
