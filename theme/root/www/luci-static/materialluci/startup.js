/* MaterialLuCI Classic Native. Appearance only; no router writes. */
"use strict";
(function(){
 const root=document.documentElement, query=matchMedia("(prefers-color-scheme: dark)");
 const get=(key,fallback)=>{try{return localStorage.getItem("materialluci-"+key)||fallback;}catch(_){return fallback;}};
 const prefs={mode:get("mode","system"),seed:get("seed","#42A5F5"),cards:get("cards","false")==="true",toolbar:get("toolbar","false")==="true",categories:get("categories","false")==="true",icons:get("icons","false")==="true"};
 if(!["system","light","dark"].includes(prefs.mode)) prefs.mode="system";
 if(!/^#[0-9a-f]{6}$/i.test(prefs.seed)) prefs.seed="#42A5F5";
 prefs.seed=prefs.seed.toUpperCase();
 function apply(){
  const dark=prefs.mode==="dark"||(prefs.mode==="system"&&query.matches),p=MaterialPalette.generate(prefs.seed,dark);
  root.dataset.theme=dark?"dark":"light";root.dataset.cards=String(prefs.cards);
  root.dataset.toolbar=String(prefs.toolbar);root.dataset.categories=String(prefs.categories);root.dataset.icons=String(prefs.icons);
  root.style.colorScheme=dark?"dark":"light";
  const mapping={seed:"seed",primarySurface:"primary-surface",onPrimary:"on-primary",primaryPressed:"primary-pressed",accentInk:"accent-ink",controlAccent:"control-accent",controlStrong:"control-strong",actionPrimary:"action-fill",onActionPrimary:"on-accent",actionPrimaryPressed:"action-pressed",actionSecondary:"action-tonal",onActionSecondary:"on-action-tonal",actionSecondaryPressed:"tonal-pressed",switchThumb:"switch-thumb",switchTrack:"switch-track",navIcon:"nav-icon",navLabel:"nav-label",swatchForeground:"swatch-foreground"};
  for(const [key,css] of Object.entries(mapping)) root.style.setProperty("--"+css,p[key]);
 }
 const api={prefs,apply,set(key,value){if(!(key in prefs))return;if(key==="seed"&&!/^#[0-9a-f]{6}$/i.test(value))return;if(key==="mode"&&!["system","light","dark"].includes(value))return;prefs[key]=key==="seed"?value.toUpperCase():value;try{localStorage.setItem("materialluci-"+key,String(prefs[key]));}catch(_){}apply();window.dispatchEvent(new Event("materialluci:appearance"));}};
 window.MaterialAppearance=api;apply();
 if(query.addEventListener)query.addEventListener("change",()=>{if(prefs.mode==="system")apply();});else query.addListener(()=>{if(prefs.mode==="system")apply();});
 window.setTimeout(()=>{if(!window.MaterialLuCI){root.dataset.startupError="true";const e=document.getElementById("ml-startup-error");if(e)e.hidden=false;}},10000);
})();
