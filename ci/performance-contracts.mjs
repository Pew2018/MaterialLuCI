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
  constructor(tag){super();this.nodeType=1;this.tagName=tag.toUpperCase();this.parentElement=null;this.children=[];this.attrs=new Map();this.dataset={};this.values=new Map();this.textContent="";this.tabIndex=0;this.rect={left:0,top:0,bottom:100,width:200};this.reads=0;this.writes=0;this.attributeWrites=0;
   this.style={getPropertyValue:key=>this.values.get(key)||"",setProperty:(key,value)=>{this.writes++;this.values.set(key,value);notify({type:"attributes",target:this,attributeName:"style",addedNodes:[],removedNodes:[]});},removeProperty:key=>{if(this.values.delete(key)){this.writes++;notify({type:"attributes",target:this,attributeName:"style",addedNodes:[],removedNodes:[]});}}};
   this.classList={contains:key=>(this.className||"").split(/\s+/).includes(key),add:(...keys)=>{const list=new Set((this.className||"").split(/\s+/).filter(Boolean));keys.forEach(k=>list.add(k));this.className=[...list].join(" ");},remove:(...keys)=>{this.className=(this.className||"").split(/\s+/).filter(k=>!keys.includes(k)).join(" ");},toggle:(key,force)=>{const yes=force??!this.classList.contains(key);yes?this.classList.add(key):this.classList.remove(key);return yes;}};
  }
  get className(){return this.attrs.get("class")||"";}set className(value){if(value!==this.className)this.setAttribute("class",value);}
  get id(){return this.getAttribute("id")||"";}set id(value){this.setAttribute("id",value);}
  get isConnected(){return this===document.body||!!this.parentElement?.isConnected;}
  get firstElementChild(){return this.children[0]||null;}
  get parentNode(){return this.parentElement;}
  getAttribute(key){if(key.startsWith("data-"))return this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]??null;return this.attrs.get(key)??null;}
  hasAttribute(key){return this.getAttribute(key)!==null;}
  setAttribute(key,value){this.attributeWrites++;const oldValue=this.getAttribute(key);this.attrs.set(key,String(value));if(key.startsWith("data-"))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);notify({type:"attributes",target:this,attributeName:key,oldValue,addedNodes:[],removedNodes:[]});}
  removeAttribute(key){if(this.attrs.has(key)){this.attributeWrites++;const oldValue=this.getAttribute(key);this.attrs.delete(key);if(key.startsWith("data-"))delete this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())];notify({type:"attributes",target:this,attributeName:key,oldValue,addedNodes:[],removedNodes:[]});}}
  get disabled(){return this.hasAttribute("disabled");}set disabled(value){value?this.setAttribute("disabled",""):this.removeAttribute("disabled");}
  matches(selector){return selector.split(/,(?![^()]*\))/).some(part=>{
   part=part.trim();if(part===":disabled"){this.reads++;return this.disabled||!!this.closest("fieldset")?.disabled;}
   const exclusions=[...part.matchAll(/:not\(([^()]*)\)/g)].map(m=>m[1]);part=part.replace(/:not\([^()]*\)/g,"");
   if(exclusions.some(s=>this.matches(s)))return false;
   const direct=part.match(/^(.*?)\s*>\s*([^>]+)$/);
   if(direct)return this.matches(direct[2])&&!!this.parentElement?.matches(direct[1]);
   const descendant=part.match(/^(.*?)\s+([^\s]+)$/);
   if(descendant)return this.matches(descendant[2])&&!!this.parentElement?.closest(descendant[1]);
   if(part.includes(":empty")){if(this.children.length||this.textContent)return false;part=part.replace(":empty","");}

   const id=part.match(/#([\w-]+)/)?.[1];if(id&&this.id!==id)return false;
   if([...part.matchAll(/\.([\w-]+)/g)].some(m=>!this.classList.contains(m[1])))return false;
   if([...part.matchAll(/\[([\w-]+)(?:=["']?([^"'\]]*)["']?)?\]/g)].some(m=>m[2]!==undefined?this.getAttribute(m[1])!==m[2]:!this.hasAttribute(m[1])))return false;
   const tag=part.match(/^[\w-]+/)?.[0];return !tag||this.tagName===tag.toUpperCase();
  });}
  contains(n){return n===this||this.children.some(c=>c.contains(n));}
  closest(selector){for(let n=this;n;n=n.parentElement)if(n.matches(selector))return n;return null;}
  querySelectorAll(selector){if(selector.includes(":scope"))return [...new Set(selector.split(",").flatMap(s=>s.trim().startsWith(":scope")?this.children.filter(n=>n.matches(s.trim().replace(/^:scope\s*>\s*/,""))):this.querySelectorAll(s.trim())))];const out=[];for(const child of this.children){if(child.matches(selector))out.push(child);out.push(...child.querySelectorAll(selector));}return out;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  append(...nodes){for(const n of nodes){n.remove();n.parentElement=this;this.children.push(n);notify({type:"childList",target:this,addedNodes:[n],removedNodes:[]});}}
  insertBefore(n,reference){const index=this.children.indexOf(reference);this.append(n);this.children.splice(this.children.indexOf(n),1);this.children.splice(index,0,n);return n;}
  replaceChildren(...nodes){for(const n of [...this.children])n.remove();this.append(...nodes);}
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
 document.querySelector=selector=>document.body.querySelector(selector);
 document.createElement=tag=>tag==="input"?new Input():new Element(tag);
 class Observer{constructor(callback){this.callback=callback;this.targets=[];this.records=[];this.queued=false;observers.push(this);}observe(target,options){this.targets.push([target,options]);}takeRecords(){return this.records.splice(0);}disconnect(){this.targets=[];this.records=[];}}
 const window=new Events();
 const context=vm.createContext({window,document,MutationObserver:Observer,ResizeObserver:class{observe(){}unobserve(){}disconnect(){}},HTMLInputElement:Input,AbortController,Event:class{constructor(type){this.type=type;}},console,innerWidth:800,performance:{now:()=>clock++},queueMicrotask:queue,setTimeout:fn=>{const id=++sequence;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>{const id=++sequence;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)});
 function load(name){vm.runInContext(fs.readFileSync(base+name,"utf8"),context,{filename:name});Object.assign(context,window);}
 function drain(){for(let i=0;i<3000;i++){if(micro.length){micro.shift()();continue;}const map=timers.size?timers:frames;if(!map.size)return;const [id,fn]=map.entries().next().value;map.delete(id);fn();}throw Error("Scheduler did not settle");}
 function drainMicro(){for(let i=0;i<3000&&micro.length;i++)micro.shift()();assert.equal(micro.length,0);}
 return {context,window,document,Element,Input,observers,load,drain,drainMicro,notify};
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
 const f=fixture();f.context.MaterialAppearance={activeDesign:"m3e"};f.context.customElements=f.window.customElements={get:()=>true};f.load("runtime.js");f.load("components.js");
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
 const f=fixture();let layoutPrepared=false;f.window.MaterialSurfaces={ensure(){layoutPrepared=true;}};f.context.MaterialComponents={isM3:()=>true,progress(node){node.dataset.mlComponent="progress";return {open(){},destroy(){}};}};
 f.load("runtime.js");f.window.MaterialRuntime.start(f.document.body);
 const view=f.document.createElement("div");view.id="view";const loader=f.document.createElement("p");loader.className="spinning";view.append(loader);f.document.body.append(view);
 f.load("wait.js");f.drain();assert.equal(f.window.MaterialWait.activeCount(),1);
 const field=f.document.createElement("div");view.append(field);f.drain();
 assert.ok(!f.observers.some(o=>o.targets.some(([n,options])=>n===view&&options.attributes&&options.subtree)),"view classes must not be observed recursively");
 field.className="focused";f.drain();assert.equal(f.window.MaterialWait.activeCount(),1);
 loader.remove();f.drain();assert.ok(layoutPrepared,"view layout must be prepared before removing load feedback");assert.equal(f.window.MaterialWait.activeCount(),0,"completed view must remove its loader");
 const overlay=f.document.createElement("div");overlay.id="modal_overlay";const modal=f.document.createElement("div");modal.className="modal spinning";overlay.append(modal);f.document.body.append(overlay);f.document.body.classList.add("modal-overlay-active");f.drain();
 assert.equal(f.window.MaterialWait.isActive(),true);const progress=overlay.querySelector(".ml-wait-progress"),writes=progress.writes;
 f.window.dispatchEvent({type:"resize"});f.window.dispatchEvent({type:"resize"});f.drain();assert.equal(progress.writes,writes,"unchanged geometry must not be written again");
 f.window.dispatchEvent({type:"pagehide",persisted:true});f.window.dispatchEvent({type:"pageshow",persisted:true});f.drain();assert.equal(f.window.MaterialWait.isActive(),true,"bfcache restore must retain active feedback");
 modal.classList.remove("spinning");f.drain();assert.equal(f.window.MaterialWait.isActive(),false);
 f.window.dispatchEvent({type:"pagehide",persisted:false});f.drain();assert.equal(f.window.MaterialWait.activeCount(),0);
}
{
 const f=fixture();
 class Select extends f.Element{
  constructor(){super("select");this.index=0;this.optionReads=0;this.multiple=false;this.size=0;this.required=false;this.validity={valid:true};this.labels=[];this.name="choice";}
  get options(){this.optionReads++;return this.children;}
  get selectedIndex(){return this.index;}set selectedIndex(value){this.index=value;}
  get value(){return this.children[this.index]?.value||"";}set value(value){this.index=this.children.findIndex(n=>n.value===value);}
 }
 class Option extends f.Element{
  constructor(value){super("option");this.value=value;this.textContent=value;}
  get selected(){return this.parentElement?.selectedIndex===this.parentElement?.children.indexOf(this);}
  set selected(value){if(value)this.parentElement.selectedIndex=this.parentElement.children.indexOf(this);}
 }
 class Menu{
  constructor(root){this.root=root;this.state=false;}get open(){return this.state;}set open(value){this.state=value;}
  get items(){return this.root.querySelectorAll("li");}
  setIsHoisted(){}setFixedPosition(){}setDefaultFocusState(){}setEnabled(){}setAnchorElement(){}layout(){}destroy(){}
 }
 class SelectAdapter{
  constructor(root,a,b,c,d,factory){this.selectedIndex=-1;this.disabled=false;this.required=false;this.valid=true;this.layouts=0;this.menu=factory(root.querySelector(".mdc-select__menu"));}
  setSelectedIndex(value){this.selectedIndex=value;}layoutOptions(){this.layouts++;}destroy(){}
 }
 f.context.MaterialMDCControls={MDCMenu:Menu,MDCSelect:SelectAdapter,MDCList:class{},MDCRipple:class{destroy(){}},MDCTooltip:class{},MDCSnackbar:class{},DefaultFocusState:{NONE:0}};
 f.load("runtime.js");f.load("extras.js");
 const select=new Select(),a=new Option("a"),b=new Option("b");select.append(a,b);f.document.body.append(select);f.window.MaterialExtras.enhance(select);f.drain();
 const adapter=select._mlMdcSelect;assert.ok(adapter);
 select.value="b";select.optionReads=0;f.drain();assert.equal(adapter.selectedIndex,1);assert.equal(select.optionReads,0,"value-only changes must not rebuild options");
 select.disabled=true;select.optionReads=0;f.drain();assert.equal(adapter.disabled,true);assert.equal(select.optionReads,0,"disabled-only changes must not rebuild options");
 b.disabled=true;select.optionReads=0;f.drain();assert.equal(select.optionReads,1,"option state changes must invalidate the cached options");
 const before=adapter.layouts;b.textContent="Updated";f.notify({type:"characterData",target:b,addedNodes:[],removedNodes:[]});f.drain();assert.ok(adapter.layouts>before,"option text changes must refresh the menu");
 const c=new Option("c");select.append(c);f.drain();select.value="c";f.drain();assert.equal(adapter.selectedIndex,2,"new native options must remain selectable");
}

{
 const f=fixture(),main=f.document.createElement("main");main.id="maincontent";f.document.body.append(main);
 f.load("runtime.js");f.load("surfaces.js");f.window.MaterialRuntime.start(f.document.body);
 let decorations=0;f.window.MaterialRuntime.register({selector:"input",enhance(){decorations++;}});
 const view=f.document.createElement("div");view.id="view";main.append(view);
 const section=f.document.createElement("section");section.className="cbi-section";
 const value=f.document.createElement("div");value.className="cbi-value";section.append(value);
 const input=f.document.createElement("input");value.append(input);view.append(section);
 f.drainMicro();
 assert.ok(section.classList.contains("ml-card-surface"),"new business sections must own cards before decoration timers run");
 assert.equal(decorations,0);
 f.window.MaterialSurfaces.ensure(view);f.drain();
 const passes=f.window.MaterialSurfaces.count(),writes=section.attributeWrites;
 const text=f.document.createElement("span");value.append(text);f.drain();
 text.textContent="12:34";f.notify({type:"characterData",target:text,addedNodes:[],removedNodes:[]});f.drain();
 const svg=f.document.createElement("svg"),path=f.document.createElement("path");value.append(svg);svg.append(path);f.drain();
 assert.equal(f.window.MaterialSurfaces.count(),passes,"text and SVG-path updates must not rescan card ownership");
 f.window.MaterialSurfaces.prepare(view);
 assert.equal(section.attributeWrites,writes,"unchanged cards must not remove/re-add classes");
 // Complete embedded SectionValue sections own their surfaces, not the outer section.
 const nested=f.document.createElement("fieldset");value.append(nested);f.drainMicro();
 assert.ok(value.classList.contains("ml-section-container"));
 assert.ok(nested.classList.contains("ml-card-surface"));assert.ok(!section.classList.contains("ml-card-surface"));
 // A flat view keeps its own card after repeated classification.
 const paragraph=f.document.createElement("p");view.replaceChildren(paragraph);f.drainMicro();
 assert.ok(view.classList.contains("ml-card-surface"));
 f.window.MaterialSurfaces.prepare(view);assert.ok(view.classList.contains("ml-card-surface"));
 // Native data tables retain their node; only their scroll host is inserted.
 const table=f.document.createElement("table"),row=f.document.createElement("tr");table.append(row);
 for(let i=0;i<5;i++)row.append(f.document.createElement("td"));view.replaceChildren(table);f.drainMicro();
 assert.ok(table.parentElement.classList.contains("ml-table-scroll"));assert.ok(table.parentElement.classList.contains("ml-card-surface"));
 const tablePasses=f.window.MaterialSurfaces.count();row.append(f.document.createElement("td"));f.drain();
 assert.equal(f.window.MaterialSurfaces.count(),tablePasses,"polling table cells must not reclassify cards");

 // Small tables remain native and polling their additional rows does not scan layout.
 const small=f.document.createElement("table"),smallFirst=f.document.createElement("tr");smallFirst.append(f.document.createElement("td"),f.document.createElement("td"));small.append(smallFirst);view.replaceChildren(small);f.drain();
 const smallPasses=f.window.MaterialSurfaces.count(),smallNext=f.document.createElement("tr");smallNext.append(f.document.createElement("td"),f.document.createElement("td"));small.append(smallNext);f.drain();
 assert.equal(f.window.MaterialSurfaces.count(),smallPasses);
 // An empty table can populate later; only its first effective row needs layout.
 const lateTable=f.document.createElement("table");view.replaceChildren(lateTable);f.drain();
 const lateRow=f.document.createElement("tr");for(let i=0;i<4;i++)lateRow.append(f.document.createElement("td"));lateTable.append(lateRow);f.drainMicro();
 assert.ok(lateTable.parentElement.classList.contains("ml-table-scroll"));
 // SVG construction may complete after the view; updates to an existing plot are cheap.
 const plotHost=f.document.createElement("div"),plot=f.document.createElement("svg");plotHost.append(plot);view.replaceChildren(plotHost);f.drain();
 plot.append(f.document.createElement("polyline"),f.document.createElement("line"));f.drainMicro();
 assert.ok(plotHost.classList.contains("ml-chart-surface"));assert.ok(plotHost.classList.contains("ml-card-surface"));
 const plotPasses=f.window.MaterialSurfaces.count();plot.append(f.document.createElement("text"));f.drain();
 assert.equal(f.window.MaterialSurfaces.count(),plotPasses,"existing chart updates must not rescan card ownership");

 // Hidden native tabs are classified without waiting for their controls.
 const map=f.document.createElement("div");map.className="cbi-map";
 const tab=f.document.createElement("div");tab.setAttribute("data-tab","advanced");tab.setAttribute("data-tab-title","Advanced");
 const hiddenSection=f.document.createElement("section");hiddenSection.className="cbi-section";tab.append(hiddenSection);map.append(tab);view.replaceChildren(map);f.drainMicro();
 assert.ok(tab.classList.contains("ml-card-surface"));
 tab.setAttribute("data-tab-active","true");f.drain();assert.ok(tab.classList.contains("ml-card-surface"));
 // Legacy flash group roles are idempotent and business child order is intact.
 view.remove();main.dataset.mlPage="flashops";
 const legacy=f.document.createElement("div");legacy.className="cbi-section";
 const children=["h3","p","h3","form"].map(tag=>f.document.createElement(tag));legacy.append(...children);main.append(legacy);f.drain();
 const legacyWrites=children.map(n=>n.attributeWrites);f.window.MaterialSurfaces.prepare(main);
 assert.deepEqual(children.map(n=>n.attributeWrites),legacyWrites);assert.deepEqual(legacy.children,children);
}
{
 const f=fixture();f.context.MaterialAppearance={activeDesign:"m3e"};f.context.customElements=f.window.customElements={get:()=>true};f.load("runtime.js");f.load("components.js");
 const fieldset=f.document.createElement("fieldset"),input=f.document.createElement("input");input.type="checkbox";input.name="flag";fieldset.append(input);f.document.body.append(fieldset);
 const e=f.window.MaterialComponents.switchControl(input,"Flag");fieldset.append(e.control);
 assert.equal(f.window.MaterialComponents.switchControl(input,"Flag"),e,"one native input must retain one M3 switch adapter");
 f.drain();input.reads=0;input.checked=true;input.dispatchEvent({type:"input"});input.dispatchEvent({type:"change"});f.drain();
 assert.equal(e.control.selected,true);assert.equal(input.reads,1,"hook/input/change must coalesce to one effective-state read");
 input.reads=0;input.checked=true;f.drain();assert.equal(input.reads,0,"unchanged property assignment must not schedule a sync");
 fieldset.disabled=true;f.drain();assert.ok(e.control.disabled);fieldset.disabled=false;f.drain();assert.ok(!e.control.disabled);
 input.checked=false;e.destroy();f.drain();assert.ok(!e.control.isConnected);assert.equal(input.getAttribute("tabindex"),null);
 const checkbox=f.document.createElement("input");checkbox.type="checkbox";checkbox.name="choice";fieldset.append(checkbox);
 const choice=f.window.MaterialComponents.selectionControl(checkbox,"Choice");f.drain();
 assert.equal(f.window.MaterialComponents.selectionControl(checkbox,"Choice"),choice);
 checkbox.reads=0;for(let i=0;i<12;i++)f.window.MaterialComponents.syncSelections(checkbox);f.drain();
 assert.equal(checkbox.reads,1,"a checkbox must use one stable group and one state read per batch");
 choice.destroy();f.drain();
}


{
 const f=fixture();f.context.MaterialMDCControls={MDCRipple:class{},MDCRippleFoundation:class{}};
 f.context.MaterialComponents={isM3:()=>true};f.context.customElements={get:()=>true};
 const reduced=new f.Element("media");reduced.matches=false;f.context.matchMedia=()=>reduced;
 f.Element.prototype.attach=function(){this.attached=true;};f.Element.prototype.detach=function(){this.attached=false;};
 f.load("runtime.js");f.load("feedback.js");f.window.MaterialRuntime.start(f.document.body);
 const button=f.document.createElement("button");f.document.body.append(button);f.drain();
 const ripple=button.querySelector("md-ripple");assert.ok(ripple?.attached);
 f.window.MaterialFeedback.bind(button);f.drain();assert.equal(button.querySelectorAll("md-ripple").length,1,"one native button must have one feedback owner");
 button.disabled=true;f.drain();const writes=ripple.attributeWrites;
 f.notify({type:"attributes",target:button,attributeName:"disabled",addedNodes:[],removedNodes:[]});f.drain();
 assert.equal(ripple.attributeWrites,writes,"unchanged ripple state must not be written again");
 const decorated=f.document.createElement("div"),internal=f.document.createElement("button");decorated.dataset.mlComponent="button";decorated.append(internal);f.document.body.append(decorated);
 f.window.MaterialFeedback.bind(decorated);f.drain();assert.equal(internal.querySelectorAll("md-ripple").length,0,"component-owned children must not acquire generic feedback");
 button.remove();f.document.body.append(button);f.drain();assert.equal(f.window.MaterialFeedback.counts().instances,1);
 button.remove();f.drain();assert.equal(f.window.MaterialFeedback.counts().instances,0);assert.ok(!ripple.attached);
}

{
 const header=fs.readFileSync("theme/root/usr/lib/lua/luci/view/themes/materialluci/header.htm","utf8"),app=fs.readFileSync(base+"app.js","utf8");
 assert.ok(header.indexOf("/surfaces.js?")<header.indexOf("/app.js?"));
 assert.ok(app.indexOf("MaterialSurfaces.prepare(main)")<app.indexOf("enhance(main);"));
 assert.ok(!app.includes("queueSurfaces"),"component discovery must not schedule a delayed card pass");
}


{
 const f=fixture(),toolbar=f.document.createElement("header"),inner=f.document.createElement("div"),title=f.document.createElement("span"),indicator=f.document.createElement("div");
 toolbar.className="ml-toolbar";inner.className="ml-toolbar-inner";title.id="ml-title";inner.append(title,indicator);toolbar.append(inner);f.document.body.append(toolbar);
 const sidebar=f.document.createElement("aside"),heading=f.document.createElement("div"),name=f.document.createElement("span");heading.id="ml-sidebar-heading";name.id="ml-sidebar-name";name.dataset.defaultName="Router";heading.append(name);sidebar.append(heading);f.document.body.append(sidebar);
 const storage=new Map();f.context.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 f.context.Event=class{constructor(type){this.type=type;}};
 let styleReads=0,background="rgb(255,255,255)",foreground="rgb(120,120,120)";
 f.context.getComputedStyle=()=>{styleReads++;return {backgroundColor:background,color:foreground,getPropertyValue:()=>foreground};};
 f.load("branding.js");f.drain();assert.equal(title.style.getPropertyValue("color"),"#000000");
 const initialReads=styleReads,initialWrites=title.writes,attrs=title.attributeWrites;
 for(let i=0;i<10;i++){f.document.documentElement.style.setProperty("--ml-vv-top",i+"px");indicator.append(f.document.createElement("span"));}
 f.drain();assert.equal(styleReads,initialReads,"viewport and indicator updates must not compute title colors");assert.equal(title.writes,initialWrites);
 f.window.MaterialBranding.apply();f.window.MaterialBranding.set("toolbarTitle","MaterialLuCI");f.drain();
 assert.equal(styleReads,initialReads);assert.equal(title.writes,initialWrites);
 const sameAttrs=title.attributeWrites;f.window.MaterialBranding.set("toolbarTitle","MaterialLuCI");f.drain();assert.equal(title.attributeWrites,sameAttrs,"unchanged title attributes must not be written");
 f.window.MaterialBranding.set("sidebarName","New Router");f.drain();assert.equal(styleReads,initialReads,"name edits must not compute title color");
 const newName=f.document.createElement("span");newName.id="ml-sidebar-name";name.remove();heading.append(newName);f.drain();assert.equal(newName.textContent,"New Router");assert.equal(styleReads,initialReads,"name node replacement must not compute title color");
 f.window.MaterialBranding.set("toolbarTitleColorValue","#123456");f.window.MaterialBranding.set("toolbarTitleColor","custom");f.drain();assert.equal(title.style.getPropertyValue("color"),"#123456");
 background="rgb(0,0,0)";foreground="rgb(100,100,100)";
 f.document.documentElement.setAttribute("data-theme","dark");f.drain();assert.equal(title.style.getPropertyValue("color"),"#123456");
 f.window.MaterialBranding.set("toolbarTitleColor","auto");f.drain();assert.equal(title.style.getPropertyValue("color"),"#FFFFFF");
 const before=styleReads;inner.style.setProperty("background-color","black");f.drain();assert.ok(styleReads>before,"real toolbar background changes must compute contrast");
 const replacement=f.document.createElement("span");replacement.id="ml-title";title.remove();inner.append(replacement);f.drain();assert.equal(replacement.textContent,"MaterialLuCI");assert.equal(replacement.style.getPropertyValue("color"),"#FFFFFF");
 f.window.dispatchEvent({type:"pagehide",persisted:true});f.document.documentElement.setAttribute("data-theme","light");background="rgb(255,255,255)";foreground="rgb(0,0,0)";f.drain();
 f.window.dispatchEvent({type:"pageshow",persisted:true});f.drain();assert.equal(replacement.style.getPropertyValue("color"),"","bfcache must restore natural theme ink");
}
{
 {
 const f=fixture();f.load("runtime.js");let fields=0;
 f.window.MaterialRuntime.register({selector:"input,select,button",enhance(){fields++;}});
 f.window.MaterialRuntime.start(f.document.body);f.drain();
 const leaf=f.document.createElement("span");let leafQueries=0;const query=leaf.querySelectorAll.bind(leaf);
 leaf.querySelectorAll=selector=>{leafQueries++;return query(selector);};
 f.document.body.append(leaf);f.drain();assert.equal(leafQueries,0,"empty leaf updates should skip descendant selector scans");
 f.document.body.append(f.document.createElement("input"));f.drain();assert.equal(fields,1,"direct dynamic controls are still discovered");
 const wrapper=f.document.createElement("div");wrapper.append(f.document.createElement("button"));f.document.body.append(wrapper);f.drain();
 assert.equal(fields,2,"nested dynamic controls are still discovered");
}
const f=fixture();f.load("runtime.js");let fields=0,buttons=0,ranges=0;
 f.window.MaterialRuntime.register({selector:"input,select",enhance(){fields++;}});
 f.window.MaterialRuntime.register({selector:"button",enhance(){buttons++;}});
 f.window.MaterialRuntime.register({range:true,discoverSelector:"#view,.alert-message.danger",enhance(){ranges++;}});
 f.window.MaterialRuntime.start(f.document.body);f.drain();
 const status=f.document.createElement("span");f.document.body.append(status);const path=f.document.createElement("path");status.append(path);f.drain();
 assert.deepEqual([fields,buttons,ranges],[0,0,0],"status elements must not dispatch irrelevant adapters");
 const input=f.document.createElement("input");status.append(input);f.drain();assert.equal(fields,1,"an existing status container can later receive a real field");
 const container=f.document.createElement("div");container.append(f.document.createElement("select"),f.document.createElement("button"));f.document.body.append(container);f.drain();assert.deepEqual([fields,buttons,ranges],[2,1,0]);
 const view=f.document.createElement("div");view.id="view";f.document.body.append(view);f.drain();assert.equal(ranges,1);
}
{
 // Execute the actual viewport handler without constructing the rest of the UI.
 const f=fixture(),vv=new f.Element("viewport");vv.height=800;vv.width=400;Object.defineProperties(vv,{offsetTop:{value:0,writable:true},offsetLeft:{value:0,writable:true}});vv.scale=1;
 f.context.innerHeight=800;f.context.innerWidth=400;f.window.visualViewport=vv;f.context.narrow={matches:true};f.context.toolbar=null;f.load("runtime.js");
 const app=fs.readFileSync(base+"app.js","utf8");vm.runInContext(app.slice(app.indexOf(" const vv=window.visualViewport"),app.indexOf(" window.MaterialLuCI=")),f.context);
 const input=f.document.createElement("input");input.setAttribute("type","text");f.document.body.append(input);f.document.activeElement=input;
 const root=f.document.documentElement;const writes=root.writes;vv.dispatchEvent({type:"scroll"});f.drain();assert.equal(root.writes,writes,"focused input without keyboard must not write viewport geometry");
 vv.height=480;f.window.dispatchEvent({type:"resize"});f.drain();assert.equal(root.style.getPropertyValue("--ml-keyboard-space"),"320px");
 const keyboardWrites=root.writes;vv.dispatchEvent({type:"scroll"});f.drain();assert.equal(root.writes,keyboardWrites,"identical geometry must not write styles");
 vv.height=800;f.window.dispatchEvent({type:"resize"});f.drain();assert.equal(root.style.getPropertyValue("--ml-keyboard-space"),"");const closedWrites=root.writes;
 vv.offsetTop=24;vv.dispatchEvent({type:"scroll"});f.drain();assert.equal(root.writes,closedWrites,"keyboard closed with retained focus must not track scrolling");
 input.setAttribute("type","range");vv.height=400;f.window.dispatchEvent({type:"resize"});f.drain();assert.equal(root.writes,closedWrites,"range input must not activate keyboard adaptation");
 input.setAttribute("type","text");vv.scale=2;f.window.dispatchEvent({type:"resize"});f.drain();assert.equal(root.writes,closedWrites,"zoom must not masquerade as keyboard");
 f.document.body.classList.add("ml-dialog-open");f.drain();assert.equal(root.style.getPropertyValue("--ml-vv-height"),"400px","dialog geometry must remain supported at zoom");
 f.window.dispatchEvent({type:"pagehide",persisted:true});f.window.dispatchEvent({type:"pageshow",persisted:true});f.drain();assert.equal(root.style.getPropertyValue("--ml-vv-height"),"400px");
}
{
 // Parse the authored LED rule and apply its selector to real abbreviation
 // structures in the DOM fixture; this checks scope/semantics, not CSS paint.
 const css=fs.readFileSync(base+"cascade.css","utf8"),rules=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m=>({selector:m[1].replace(/\/\*[\s\S]*?\*\//g,"").trim(),declarations:m[2].trim()}));
 const ledRules=rules.filter(r=>r.selector.includes("abbr"));assert.equal(ledRules.length,1);
 const declarations=Object.fromEntries(ledRules[0].declarations.split(";").filter(Boolean).map(s=>s.split(":").map(v=>v.trim())));assert.deepEqual(declarations,{"text-decoration":"none"});
 const f=fixture(),main=f.document.createElement("main");main.id="maincontent";main.setAttribute("data-ml-page","leds");f.document.body.append(main);
 const abbreviations=["h2","p","th"].map(tag=>{const host=f.document.createElement(tag),abbr=f.document.createElement("abbr");abbr.textContent="LED";abbr.setAttribute("title","Light Emitting Diode");host.append(abbr);main.append(host);return abbr;});
 for(const design of ["classic","m3e"])for(const theme of ["light","dark"]){f.document.documentElement.dataset.design=design;f.document.documentElement.dataset.theme=theme;assert.ok(abbreviations.every(n=>n.matches(ledRules[0].selector)&&n.getAttribute("title")==="Light Emitting Diode"));}
 for(const tag of ["a","input","button"]){const n=f.document.createElement(tag);main.append(n);assert.ok(!n.matches(ledRules[0].selector));}
 main.setAttribute("data-ml-page","system");assert.ok(abbreviations.every(n=>!n.matches(ledRules[0].selector)),"other routes must retain their abbreviation styles");
}

{
 const f=fixture();f.load("runtime.js");
 const host=f.document.createElement("div");host.id="indicators";
 const el=f.document.createElement("span");el.setAttribute("data-indicator","poll-status");el.setAttribute("data-style","inactive");host.append(el);f.document.body.append(host);
 let binds=0;f.context.MaterialFeedback={bind(){binds++;}};f.context.MaterialExtras={setTooltip(n,label){f.window.MaterialRuntime.setAttr(n,"data-test-tip",label);}};
 const app=fs.readFileSync(base+"app.js","utf8");
 vm.runInContext('(function(){const t=(a,b)=>b;'+app.slice(app.indexOf(" const indicators="),app.indexOf(" const narrow="))+'window.syncPoll=syncPollIndicator;})();',f.context);
 f.drain();const writes=el.attributeWrites;
 for(let i=0;i<20;i++)f.window.syncPoll();f.drain();
 assert.equal(el.attributeWrites,writes,"same refresh state must perform zero attribute writes");
 assert.equal(binds,1);
 el.setAttribute("data-style","active");f.drain();assert.equal(el.getAttribute("aria-label"),"Pause automatic refresh");
 const next=f.document.createElement("span");next.setAttribute("data-indicator","poll-status");next.setAttribute("data-style","inactive");next.setAttribute("data-clickable","true");el.remove();host.append(next);f.drain();
 assert.equal(binds,2,"replacement has exactly one feedback binding");
 assert.equal(next.getAttribute("aria-label"),"Resume automatic refresh");
}
console.log("Runtime lifecycle, discovery dispatch, branding, viewport and LED scope contracts passed (no browser rendering).");
