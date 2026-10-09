"use strict";
(function(){
 const bound=new WeakSet(),pending=new WeakMap();
 function scrolls(el){const s=[];for(let n=el.parentElement;n;n=n.parentElement)if(n.scrollHeight>n.clientHeight||n.scrollWidth>n.clientWidth)s.push([n,n.scrollTop,n.scrollLeft]);return s;}
 function disabled(el){return el.disabled||el.hasAttribute("disabled")||el.querySelector("input:disabled")||el.closest('[aria-disabled="true"]');}
 function bind(el){
  if(bound.has(el))return;bound.add(el);el.dataset.ripple="control";
  el.addEventListener("pointerdown",e=>{if(!e.isPrimary||e.button!==0||disabled(el))return;pending.set(el,{id:e.pointerId,x:e.clientX,y:e.clientY,scrolls:scrolls(el)});},{passive:true});
  el.addEventListener("pointercancel",()=>pending.delete(el),{passive:true});
  el.addEventListener("pointerup",e=>{
   const p=pending.get(el);pending.delete(el);
   if(!p||p.id!==e.pointerId||disabled(el)||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
   if(Math.hypot(e.clientX-p.x,e.clientY-p.y)>(e.pointerType==="mouse"?8:10)||p.scrolls.some(([n,y,x])=>Math.abs(n.scrollTop-y)>2||Math.abs(n.scrollLeft-x)>2))return;
   const r=el.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;const x=e.clientX-r.left,y=e.clientY-r.top,rad=Math.hypot(Math.max(x,r.width-x),Math.max(y,r.height-y));
   const c=document.createElement("span");c.className="tap-ripple";c.setAttribute("aria-hidden","true");
   Object.assign(c.style,{width:rad*2+"px",height:rad*2+"px",left:x-rad+"px",top:y-rad+"px"});
   const cleanup=setTimeout(()=>c.remove(),500);c.addEventListener("animationend",()=>{clearTimeout(cleanup);c.remove();},{once:true});el.appendChild(c);
  },{passive:true});
 }
 window.MaterialFeedback={bind(root=document){
  const selector="button:not(.ml-nav-parent),div.btn,.ml-switch-hit,.ml-native-button,.ml-nav-row-action,.ml-sidebar a,.tabs a,.cbi-tabmenu a";
  if(root.matches&&root.matches(selector))bind(root);
  root.querySelectorAll(selector).forEach(bind);
 }};
})();
