import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
const base="theme/root/www/luci-static/materialluci/";
/* Small DOM/event doubles test adapter lifecycles, not rendering or frame rate. */
function fixture(){
 const micro=[],timers=new Map(),frames=new Map(),observers=[];let sequence=0,clock=0;
 const queue=fn=>micro.push(fn);
 class Events{
  constructor(){this.listeners=new Map();}
  addEventListener(type,fn,options){if(options?.signal?.aborted)return;let set=this.listeners.get(type);if(!set)this.listeners.set(type,set=new Set());set.add(fn);options?.signal?.addEventListener("abort",()=>set.delete(fn),{once:true});}
  removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
  dispatchEvent(event){event.target??=this;for(const fn of [...this.listeners.get(event.type)||[]])fn(event);return !event.defaultPrevented;}
 }
 function notify(record){for(const observer of observers)if(observer.targets.some(([target,o])=>(record.target===target||o.subtree&&target.contains(record.target))&&(record.type==="childList"?o.childList:o.attributes&&(!o.attributeFilter||o.attributeFilter.includes(record.attributeName))))){observer.records.push(record);if(!observer.queued){observer.queued=true;queue(()=>{observer.queued=false;const records=observer.records.splice(0);if(records.length)observer.callback(records);});}}}
 class Element extends Events{
  constructor(tag){super();this.nodeType=1;this.tagName=tag.toUpperCase();this.parentElement=null;this.children=[];this.attrs=new Map();this.dataset={};this.values=new Map();this.textContent="";this.tabIndex=0;this.rect={left:0,top:0,bottom:100,width:200};this.reads=0;this.writes=0;
   this.style={getPropertyValue:key=>this.values.get(key)||"",setProperty:(key,value)=>{this.writes++;this.values.set(key,value);}};
   this.classList={contains:key=>(this.className||"").split(/\s+/).includes(key),add:(...keys)=>{const list=new Set((this.className||"").split(/\s+/).filter(Boolean));keys.forEach(k=>list.add(k));this.className=[...list].join(" ");},remove:(...keys)=>{this.className=(this.className||"").split(/\s+/).filter(k=>!keys.includes(k)).join(" ");},toggle:(key,force)=>{const yes=force??!this.classList.contains(key);yes?this.classList.add(key):this.classList.remove(key);return yes;}};
  }
  get className(){return this.attrs.get("class")||"";}set className(value){if(value!==this.className)this.setAttribute("class",value);}
  get id(){return this.getAttribute("id")||"";}set id(value){this.setAttribute("id",value);}
  get isConnected(){return this===document.body||!!this.parentElement?.isConnected;}
  get firstElementChild(){return this.children[0]||null;}
  get parentNode(){return this.parentElement;}
  getAttribute(key){if(key.startsWith("data-"))return this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]??null;return this.attrs.get(key)??null;}
  hasAttribute(key){return this.getAttribute(key)!==null;}
  setAttribute(key,value){const oldValue=this.getAttribute(key);this.attrs.set(key,String(value));notify({type:"attributes",target:this,attributeName:key,oldValue,addedNodes:[],removedNodes:[]});}
  removeAttribute(key){if(this.attrs.has(key)){const oldValue=this.getAttribute(key);this.attrs.delete(key);notify({type:"attributes",target:this,attributeName:key,oldValue,addedNodes:[],removedNodes:[]});}}
  get disabled(){return this.hasAttribute("disabled");}set disabled(value){value?this.setAttribute("disabled",""):this.removeAttribute("disabled");}
  matches(selector){return selector.split(",").some(part=>{
   part=part.trim();if(part===":disabled"){this.reads++;return this.disabled||!!this.closest("fieldset")?.disabled;}
   const exclusions=[...part.matchAll(/:not\(([^()]*)\)/g)].map(m=>m[1]);part=part.replace(/:not\([^()]*\)/g,"");
   if(exclusions.some(s=>this.matches(s)))return false;
   if(part.includes(">")||part.includes(" "))return false;
   const id=part.match(/#([\w-]+)/)?.[1];if(id&&this.id!==id)return false;
   if([...part.matchAll(/\.([\w-]+)/g)].some(m=>!this.classList.contains(m[1])))return false;
   if([...part.matchAll(/\[([\w-]+)(?:=["']?([^"'\]]+)["']?)?\]/g)].some(m=>m[2]?this.getAttribute(m[1])!==m[2]:!this.hasAttribute(m[1])))return false;
   const tag=part.match(/^[\w-]+/)?.[0];return !tag||this.tagName===tag.toUpperCase();
  });}
  contains(n){return n===this||this.children.some(c=>c.contains(n));}
  closest(selector){for(let n=this;n;n=n.parentElement)if(n.matches(selector))return n;return null;}
  querySelectorAll(selector){if(selector.startsWith(":scope"))return this.children.filter(n=>n.matches(selector.replace(/^:scope\s*>\s*/,"")));const out=[];for(const child of this.children){if(child.matches(selector))out.push(child);out.push(...child.querySelectorAll(selector));}return out;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  append(...nodes){for(const n of nodes){n.remove();n.parentElement=this;this.children.push(n);notify({type:"childList",target:this,addedNodes:[n],removedNodes:[]});}}
  prepend(n){this.append(n);this.children.splice(this.children.indexOf(n),1);this.children.unshift(n);}
  before(n){const parent=this.parentElement,index=parent.children.indexOf(this);parent.append(n);parent.children.splice(parent.children.indexOf(n),1);parent.children.splice(index,0,n);}
  after(n){const parent=this.parentElement,index=parent.children.indexOf(this);parent.append(n);parent.children.splice(parent.children.indexOf(n),1);parent.children.splice(index+1,0,n);}
  remove(){const parent=this.parentElement;if(parent){parent.children.splice(parent.children.indexOf(this),1);this.parentElement=null;notify({type:"childList",target:parent,addedNodes:[],removedNodes:[this]});}}
  getBoundingClientRect(){this.reads++;return this.rect;}
  getRootNode(){return this.isConnected?document:this;}
  get offsetLeft(){return 0;}get offsetTop(){return 0;}
 }
 class Input extends Element{
  constructor(){super("input");this.type="radio";this.name="group";this.form=null;this._checked=false;this._indeterminate=false;}
  get checked(){return this._checked;}set checked(value){this._checked=!!value;if(this._checked&&this.type==="radio"&&this.name)for(const n of document.body.querySelectorAll("input"))if(n!==this&&n.name===this.name&&n.form===this.form&&n.getRootNode()===this.getRootNode())n._checked=false;}
  get indeterminate(){return this._indeterminate;}set indeterminate(value){this._indeterminate=!!value;}
  get disabled(){return super.disabled;}set disabled(value){super.disabled=value;}
 }
 const document=new Events();document.body=new Element("body");document.documentElement=new Element("html");document.documentElement.lang="en";
 document.getElementById=id=>document.body.querySelector("#"+id);
 document.createElement=tag=>tag==="input"?new Input():new Element(tag);
 class Observer{constructor(callback){this.callback=callback;this.targets=[];this.records=[];this.queued=false;observers.push(this);}observe(target,options){this.targets.push([target,options]);}disconnect(){this.targets=[];this.records=[];}}
 const window=new Events();
 const context=vm.createContext({window,document,MutationObserver:Observer,ResizeObserver:class{observe(){}unobserve(){}disconnect(){}},HTMLInputElement:Input,AbortController,console,innerWidth:800,performance:{now:()=>clock++},queueMicrotask:queue,setTimeout:fn=>{const id=++sequence;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>{const id=++sequence;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)});
 function load(name){vm.runInContext(fs.readFileSync(base+name,"utf8"),context,{filename:name});Object.assign(context,window);}
 function drain(){for(let i=0;i<3000;i++){if(micro.length){micro.shift()();continue;}const map=timers.size?timers:frames;if(!map.size)return;const [id,fn]=map.entries().next().value;map.delete(id);fn();}throw Error("Scheduler did not settle");}
 return {context,window,document,Element,Input,observers,load,drain};
}
{
 const f=fixture();f.load("runtime.js");const root=f.document.createElement("div"),input=f.document.createElement("input");root.append(input);f.document.body.append(root);
 let enhanced=0,cleaned=0;const live=new Set();
 f.window.MaterialRuntime.register({selector:"input",enhance(n){if(!live.has(n)){live.add(n);enhanced++;}},cleanup(n){if(n===input||n.contains(input)){live.delete(input);cleaned++;}}});
 f.window.MaterialRuntime.start(f.document.body);f.drain();assert.equal(enhanced,1);
 input.remove();root.append(input);f.drain();assert.equal(cleaned,0,"moving connected controls must not destroy them");
 input.remove();f.drain();assert.equal(cleaned,1);
 const second=f.document.createElement("input");root.append(second);
 f.window.dispatchEvent({type:"pagehide",persisted:true});f.drain();f.window.dispatchEvent({type:"pageshow",persisted:true});f.drain();assert.equal(enhanced,2);
}
{
 const f=fixture();f.context.MaterialAppearance={activeDesign:"m3e"};f.context.customElements={get:()=>true};f.load("runtime.js");f.load("components.js");
 const fieldset=f.document.createElement("fieldset");f.document.body.append(fieldset);const inputs=Array.from({length:8},()=>f.document.createElement("input"));inputs.forEach(n=>fieldset.append(n));
 const entries=inputs.map(n=>f.window.MaterialComponents.selectionControl(n,"Choice"));f.drain();inputs.forEach(n=>n.reads=0);
 inputs.forEach(n=>f.window.MaterialComponents.syncSelections(n));f.drain();assert.ok(inputs.reduce((sum,n)=>sum+n.reads,0)<=inputs.length*3,"one batch must sync a group once");
 inputs[0].checked=true;inputs[3].checked=true;f.drain();assert.equal(entries[0].control.checked,false);assert.equal(entries[3].control.checked,true);assert.equal(entries[3].control.tabIndex,0);
 fieldset.disabled=true;f.drain();assert.ok(entries.every(e=>e.control.disabled&&e.control.tabIndex===-1));
 fieldset.disabled=false;f.drain();assert.equal(entries[3].control.tabIndex,0);
 inputs[3].name="separate";f.window.MaterialComponents.syncSelections(inputs[3]);f.drain();assert.equal(entries[3].control.tabIndex,0);assert.equal(entries[0].control.tabIndex,0);
 entries.forEach(e=>e.destroy());f.drain();
}
{
 const f=fixture();f.context.MaterialComponents={isM3:()=>true,progress(node){node.dataset.mlComponent="progress";return {open(){},destroy(){}};}};
 f.load("runtime.js");f.window.MaterialRuntime.start(f.document.body);
 const view=f.document.createElement("div");view.id="view";const loader=f.document.createElement("p");loader.className="spinning";view.append(loader);f.document.body.append(view);
 f.load("wait.js");f.drain();assert.equal(f.window.MaterialWait.activeCount(),1);
 const field=f.document.createElement("div");view.append(field);f.drain();
 assert.ok(!f.observers.some(o=>o.targets.some(([n,options])=>n===view&&options.attributes&&options.subtree)),"view classes must not be observed recursively");
 field.className="focused";f.drain();assert.equal(f.window.MaterialWait.activeCount(),1);
 loader.remove();f.drain();assert.equal(f.window.MaterialWait.activeCount(),0,"completed view must remove its loader");
 const overlay=f.document.createElement("div");overlay.id="modal_overlay";const modal=f.document.createElement("div");modal.className="modal spinning";overlay.append(modal);f.document.body.append(overlay);f.document.body.classList.add("modal-overlay-active");f.drain();
 assert.equal(f.window.MaterialWait.isActive(),true);const progress=overlay.querySelector(".ml-wait-progress"),writes=progress.writes;
 f.window.dispatchEvent({type:"resize"});f.window.dispatchEvent({type:"resize"});f.drain();assert.equal(progress.writes,writes,"unchanged geometry must not be written again");
 f.window.dispatchEvent({type:"pagehide",persisted:true});f.window.dispatchEvent({type:"pageshow",persisted:true});f.drain();assert.equal(f.window.MaterialWait.isActive(),true,"bfcache restore must retain active feedback");
 modal.classList.remove("spinning");f.drain();assert.equal(f.window.MaterialWait.isActive(),false);
 f.window.dispatchEvent({type:"pagehide",persisted:false});f.drain();assert.equal(f.window.MaterialWait.activeCount(),0);
}
console.log("Runtime lifecycle, radio-group batching and loading-state contracts passed (no browser rendering).");
