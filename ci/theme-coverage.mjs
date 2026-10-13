/* Native method fixtures: OpenWrt LuCI openwrt-21.02 ui.js/form.js,
 * https://github.com/openwrt/luci/tree/openwrt-21.02/modules/luci-base
 * LuCI authors, Apache-2.0. Test-only copies; never shipped to firmware. */
import {chromium,webkit} from "playwright";
import fs from "node:fs";
import http from "node:http";
import assert from "node:assert/strict";
const base="build/stage/www/luci-static/materialluci/";
const results=[],backend={changes:{},calls:[]};
const server=http.createServer(async(req,res)=>{
 let body="";for await(const chunk of req)body+=chunk;
 if(req.url==="/save"){const value=JSON.parse(body);(backend.changes[value.config]??=[]).push(value.change);}
 if(req.url==="/apply"||req.url==="/revert"){backend.calls.push({op:req.url,checked:JSON.parse(body||"{}").checked});backend.changes={};}
 res.setHeader("Content-Type",req.url==="/fixture"?"text/html":"application/json");
 res.end(req.url==="/fixture"?"<!doctype html><html lang=en><body></body></html>":JSON.stringify(backend.changes));
});await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const origin="http://127.0.0.1:"+server.address().port;
const native={"setIndicator":"function(n) {\n\t\t\tif (n > 0) {\n\t\t\t\tUI.prototype.showIndicator('uci-changes',\n\t\t\t\t\t'%s: %d'.format(_('Unsaved Changes'), n),\n\t\t\t\t\tL.bind(this.displayChanges, this));\n\t\t\t}\n\t\t\telse {\n\t\t\t\tUI.prototype.hideIndicator('uci-changes');\n\t\t\t}\n\t\t}","renderChangeIndicator":"function(changes) {\n\t\t\tvar n_changes = 0;\n\n\t\t\tfor (var config in changes)\n\t\t\t\tif (changes.hasOwnProperty(config))\n\t\t\t\t\tn_changes += changes[config].length;\n\n\t\t\tthis.changes = changes;\n\t\t\tthis.setIndicator(n_changes);\n\t\t}","displayChanges":"function() {\n\t\t\tvar list = E('div', { 'class': 'uci-change-list' }),\n\t\t\t    dlg = UI.prototype.showModal(_('Configuration') + ' / ' + _('Changes'), [\n\t\t\t\tE('div', { 'class': 'cbi-section' }, [\n\t\t\t\t\tE('strong', _('Legend:')),\n\t\t\t\t\tE('div', { 'class': 'uci-change-legend' }, [\n\t\t\t\t\t\tE('div', { 'class': 'uci-change-legend-label' }, [\n\t\t\t\t\t\t\tE('ins', '&#160;'), ' ', _('Section added') ]),\n\t\t\t\t\t\tE('div', { 'class': 'uci-change-legend-label' }, [\n\t\t\t\t\t\t\tE('del', '&#160;'), ' ', _('Section removed') ]),\n\t\t\t\t\t\tE('div', { 'class': 'uci-change-legend-label' }, [\n\t\t\t\t\t\t\tE('var', {}, E('ins', '&#160;')), ' ', _('Option changed') ]),\n\t\t\t\t\t\tE('div', { 'class': 'uci-change-legend-label' }, [\n\t\t\t\t\t\t\tE('var', {}, E('del', '&#160;')), ' ', _('Option removed') ])]),\n\t\t\t\t\tE('br'), list,\n\t\t\t\t\tE('div', { 'class': 'right' }, [\n\t\t\t\t\t\tE('button', {\n\t\t\t\t\t\t\t'class': 'btn',\n\t\t\t\t\t\t\t'click': UI.prototype.hideModal\n\t\t\t\t\t\t}, [ _('Close') ]), ' ',\n\t\t\t\t\t\tE('button', {\n\t\t\t\t\t\t\t'class': 'cbi-button cbi-button-positive important',\n\t\t\t\t\t\t\t'click': L.bind(this.apply, this, true)\n\t\t\t\t\t\t}, [ _('Save & Apply') ]), ' ',\n\t\t\t\t\t\tE('button', {\n\t\t\t\t\t\t\t'class': 'cbi-button cbi-button-reset',\n\t\t\t\t\t\t\t'click': L.bind(this.revert, this)\n\t\t\t\t\t\t}, [ _('Revert') ])])])\n\t\t\t]);\n\n\t\t\tfor (var config in this.changes) {\n\t\t\t\tif (!this.changes.hasOwnProperty(config))\n\t\t\t\t\tcontinue;\n\n\t\t\t\tlist.appendChild(E('h5', '# /etc/config/%s'.format(config)));\n\n\t\t\t\tfor (var i = 0, added = null; i < this.changes[config].length; i++) {\n\t\t\t\t\tvar chg = this.changes[config][i],\n\t\t\t\t\t    tpl = this.changeTemplates['%s-%d'.format(chg[0], chg.length)];\n\n\t\t\t\t\tlist.appendChild(E(tpl.replace(/%([01234])/g, function(m0, m1) {\n\t\t\t\t\t\tswitch (+m1) {\n\t\t\t\t\t\tcase 0:\n\t\t\t\t\t\t\treturn config;\n\n\t\t\t\t\t\tcase 2:\n\t\t\t\t\t\t\tif (added != null && chg[1] == added[0])\n\t\t\t\t\t\t\t\treturn '@' + added[1] + '[-1]';\n\t\t\t\t\t\t\telse\n\t\t\t\t\t\t\t\treturn chg[1];\n\n\t\t\t\t\t\tcase 4:\n\t\t\t\t\t\t\treturn \"'%h'\".format(chg[3].replace(/'/g, \"'\\\"'\\\"'\"));\n\n\t\t\t\t\t\tdefault:\n\t\t\t\t\t\t\treturn chg[m1-1];\n\t\t\t\t\t\t}\n\t\t\t\t\t})));\n\n\t\t\t\t\tif (chg[0] == 'add')\n\t\t\t\t\t\tadded = [ chg[1], chg[2] ];\n\t\t\t\t}\n\t\t\t}\n\n\t\t\tlist.appendChild(E('br'));\n\t\t\tdlg.classList.add('uci-dialog');\n\t\t}","changeTemplates":"{\n\t\t\t'add-3':      '<ins>uci add %0 <strong>%3</strong> # =%2</ins>',\n\t\t\t'set-3':      '<ins>uci set %0.<strong>%2</strong>=%3</ins>',\n\t\t\t'set-4':      '<var><ins>uci set %0.%2.%3=<strong>%4</strong></ins></var>',\n\t\t\t'remove-2':   '<del>uci del %0.<strong>%2</strong></del>',\n\t\t\t'remove-3':   '<var><del>uci del %0.%2.<strong>%3</strong></del></var>',\n\t\t\t'order-3':    '<var>uci reorder %0.%2=<strong>%3</strong></var>',\n\t\t\t'list-add-4': '<var><ins>uci add_list %0.%2.%3=<strong>%4</strong></ins></var>',\n\t\t\t'list-del-4': '<var><del>uci del_list %0.%2.%3=<strong>%4</strong></del></var>',\n\t\t\t'rename-3':   '<var>uci rename %0.%2=<strong>%3</strong></var>',\n\t\t\t'rename-4':   '<var>uci rename %0.%2.%3=<strong>%4</strong></var>'\n\t\t}"},sort={"handleDragStart":"function(ev) {\n\t\tif (!scope.dragState || !scope.dragState.node.classList.contains('drag-handle')) {\n\t\t\tscope.dragState = null;\n\t\t\tev.preventDefault();\n\t\t\treturn false;\n\t\t}\n\n\t\tscope.dragState.node = dom.parent(scope.dragState.node, '.tr');\n\t\tev.dataTransfer.setData('text', 'drag');\n\t\tev.target.style.opacity = 0.4;\n\t}","handleDragOver":"function(ev) {\n\t\tvar n = scope.dragState.targetNode,\n\t\t    r = scope.dragState.rect,\n\t\t    t = r.top + r.height / 2;\n\n\t\tif (ev.clientY <= t) {\n\t\t\tn.classList.remove('drag-over-below');\n\t\t\tn.classList.add('drag-over-above');\n\t\t}\n\t\telse {\n\t\t\tn.classList.remove('drag-over-above');\n\t\t\tn.classList.add('drag-over-below');\n\t\t}\n\n\t\tev.dataTransfer.dropEffect = 'move';\n\t\tev.preventDefault();\n\t\treturn false;\n\t}","handleDragEnter":"function(ev) {\n\t\tscope.dragState.rect = ev.currentTarget.getBoundingClientRect();\n\t\tscope.dragState.targetNode = ev.currentTarget;\n\t}","handleDragLeave":"function(ev) {\n\t\tev.currentTarget.classList.remove('drag-over-above');\n\t\tev.currentTarget.classList.remove('drag-over-below');\n\t}","handleDragEnd":"function(ev) {\n\t\tvar n = ev.target;\n\n\t\tn.style.opacity = '';\n\t\tn.classList.add('flash');\n\t\tn.parentNode.querySelectorAll('.drag-over-above, .drag-over-below')\n\t\t\t.forEach(function(tr) {\n\t\t\t\ttr.classList.remove('drag-over-above');\n\t\t\t\ttr.classList.remove('drag-over-below');\n\t\t\t});\n\t}","handleDrop":"function(ev) {\n\t\tvar s = scope.dragState;\n\n\t\tif (s.node && s.targetNode) {\n\t\t\tvar config_name = this.uciconfig || this.map.config,\n\t\t\t    ref_node = s.targetNode,\n\t\t\t    after = false;\n\n\t\t    if (ref_node.classList.contains('drag-over-below')) {\n\t\t    \tref_node = ref_node.nextElementSibling;\n\t\t    \tafter = true;\n\t\t    }\n\n\t\t    var sid1 = s.node.getAttribute('data-sid'),\n\t\t        sid2 = s.targetNode.getAttribute('data-sid');\n\n\t\t    s.node.parentNode.insertBefore(s.node, ref_node);\n\t\t    this.map.data.move(config_name, sid1, sid2, after);\n\t\t}\n\n\t\tscope.dragState = null;\n\t\tev.target.style.opacity = '';\n\t\tev.stopPropagation();\n\t\tev.preventDefault();\n\t\treturn false;\n\t}","handleTouchMove":"function(ev) {\n\t\tif (!ev.target.classList.contains('drag-handle'))\n\t\t\treturn;\n\n\t\tvar touchLoc = ev.targetTouches[0],\n\t\t    rowBtn = ev.target,\n\t\t    rowElem = dom.parent(rowBtn, '.tr'),\n\t\t    htmlElem = document.querySelector('html'),\n\t\t    dragHandle = document.querySelector('.touchsort-element'),\n\t\t    viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);\n\n\t\tif (!dragHandle) {\n\t\t\tvar rowRect = rowElem.getBoundingClientRect(),\n\t\t\t    btnRect = rowBtn.getBoundingClientRect(),\n\t\t\t    paddingLeft = btnRect.left - rowRect.left,\n\t\t\t    paddingRight = rowRect.right - btnRect.right,\n\t\t\t    colorBg = this.determineBackgroundColor(rowElem),\n\t\t\t    colorFg = (colorBg[0] * 0.299 + colorBg[1] * 0.587 + colorBg[2] * 0.114) > 186 ? [ 0, 0, 0 ] : [ 255, 255, 255 ];\n\n\t\t\tdragHandle = E('div', { 'class': 'touchsort-element' }, [\n\t\t\t\tE('strong', [ rowElem.getAttribute('data-title') ]),\n\t\t\t\trowBtn.cloneNode(true)\n\t\t\t]);\n\n\t\t\tObject.assign(dragHandle.style, {\n\t\t\t\tposition: 'absolute',\n\t\t\t\tboxShadow: '0 0 3px rgba(%d, %d, %d, 1)'.format(colorFg[0], colorFg[1], colorFg[2]),\n\t\t\t\tbackground: 'rgba(%d, %d, %d, 0.8)'.format(colorBg[0], colorBg[1], colorBg[2]),\n\t\t\t\ttop: rowRect.top + 'px',\n\t\t\t\tleft: rowRect.left + 'px',\n\t\t\t\twidth: rowRect.width + 'px',\n\t\t\t\theight: (rowBtn.offsetHeight + 4) + 'px'\n\t\t\t});\n\n\t\t\tObject.assign(dragHandle.firstElementChild.style, {\n\t\t\t\tposition: 'absolute',\n\t\t\t\tlineHeight: dragHandle.style.height,\n\t\t\t\twhiteSpace: 'nowrap',\n\t\t\t\toverflow: 'hidden',\n\t\t\t\ttextOverflow: 'ellipsis',\n\t\t\t\tleft: (paddingRight > paddingLeft) ? '' : '5px',\n\t\t\t\tright: (paddingRight > paddingLeft) ? '5px' : '',\n\t\t\t\twidth: (Math.max(paddingLeft, paddingRight) - 10) + 'px'\n\t\t\t});\n\n\t\t\tObject.assign(dragHandle.lastElementChild.style, {\n\t\t\t\tposition: 'absolute',\n\t\t\t\ttop: '2px',\n\t\t\t\tleft: paddingLeft + 'px',\n\t\t\t\twidth: rowBtn.offsetWidth + 'px'\n\t\t\t});\n\n\t\t\tdocument.body.appendChild(dragHandle);\n\n\t\t\trowElem.classList.remove('flash');\n\t\t\trowBtn.blur();\n\t\t}\n\n\t\tdragHandle.style.top = (touchLoc.pageY - (parseInt(dragHandle.style.height) / 2)) + 'px';\n\n\t\trowElem.parentNode.querySelectorAll('[draggable]').forEach(function(tr, i, trs) {\n\t\t\tvar trRect = tr.getBoundingClientRect(),\n\t\t\t    yTop = trRect.top + window.scrollY,\n\t\t\t    yBottom = trRect.bottom + window.scrollY,\n\t\t\t    yMiddle = yTop + ((yBottom - yTop) / 2);\n\n\t\t\ttr.classList.remove('drag-over-above', 'drag-over-below');\n\n\t\t\tif ((i == 0 || touchLoc.pageY >= yTop) && touchLoc.pageY <= yMiddle)\n\t\t\t\ttr.classList.add('drag-over-above');\n\t\t\telse if ((i == (trs.length - 1) || touchLoc.pageY <= yBottom) && touchLoc.pageY > yMiddle)\n\t\t\t\ttr.classList.add('drag-over-below');\n\t\t});\n\n\t\t/* prevent standard scrolling and scroll page when drag handle is\n\t\t * moved very close (~30px) to the viewport edge */\n\n\t\tev.preventDefault();\n\n\t\tif (touchLoc.clientY < 30)\n\t\t\twindow.requestAnimationFrame(function() { htmlElem.scrollTop -= 30 });\n\t\telse if (touchLoc.clientY > viewportHeight - 30)\n\t\t\twindow.requestAnimationFrame(function() { htmlElem.scrollTop += 30 });\n\t}","handleTouchEnd":"function(ev) {\n\t\tvar rowElem = dom.parent(ev.target, '.tr'),\n\t\t    htmlElem = document.querySelector('html'),\n\t\t    dragHandle = document.querySelector('.touchsort-element'),\n\t\t    targetElem = rowElem.parentNode.querySelector('.drag-over-above, .drag-over-below'),\n\t\t    viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);\n\n\t\tif (!dragHandle)\n\t\t\treturn;\n\n\t\tif (targetElem) {\n\t\t    var isBelow = targetElem.classList.contains('drag-over-below');\n\n\t\t\trowElem.parentNode.insertBefore(rowElem, isBelow ? targetElem.nextElementSibling : targetElem);\n\n\t\t\tthis.map.data.move(\n\t\t\t\tthis.uciconfig || this.map.config,\n\t\t\t\trowElem.getAttribute('data-sid'),\n\t\t\t\ttargetElem.getAttribute('data-sid'),\n\t\t\t\tisBelow);\n\n\t\t\twindow.requestAnimationFrame(function() {\n\t\t\t\tvar rowRect = rowElem.getBoundingClientRect();\n\n\t\t\t\tif (rowRect.top < 50)\n\t\t\t\t\thtmlElem.scrollTop = (htmlElem.scrollTop + rowRect.top - 50);\n\t\t\t\telse if (rowRect.bottom > viewportHeight - 50)\n\t\t\t\t\thtmlElem.scrollTop = (htmlElem.scrollTop + viewportHeight - 50 - rowRect.height);\n\n\t\t\t\trowElem.classList.add('flash');\n\t\t\t});\n\n\t\t\ttargetElem.classList.remove('drag-over-above', 'drag-over-below');\n\t\t}\n\n\t\tdocument.body.removeChild(dragHandle);\n\t}","determineBackgroundColor":"function(node) {\n\t\tvar r = 255, g = 255, b = 255;\n\n\t\twhile (node) {\n\t\t\tvar s = window.getComputedStyle(node),\n\t\t\t    c = (s.getPropertyValue('background-color') || '').replace(/ /g, '');\n\n\t\t\tif (c != '' && c != 'transparent' && c != 'rgba(0,0,0,0)') {\n\t\t\t\tif (/^#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})$/i.test(c)) {\n\t\t\t\t\tr = parseInt(RegExp.$1, 16);\n\t\t\t\t\tg = parseInt(RegExp.$2, 16);\n\t\t\t\t\tb = parseInt(RegExp.$3, 16);\n\t\t\t\t}\n\t\t\t\telse if (/^rgba?\\(([0-9]+),([0-9]+),([0-9]+)[,)]$/.test(c)) {\n\t\t\t\t\tr = +RegExp.$1;\n\t\t\t\t\tg = +RegExp.$2;\n\t\t\t\t\tb = +RegExp.$3;\n\t\t\t\t}\n\n\t\t\t\tbreak;\n\t\t\t}\n\n\t\t\tnode = node.parentNode;\n\t\t}\n\n\t\treturn [ r, g, b ];\n\t}"};
async function setup(page,design,theme,width){
 await page.goto(origin+"/fixture");
 await page.setContent('<html lang=en><body><header class="ml-toolbar"><div class="ml-toolbar-inner"><h1 id="ml-title">Router</h1><div id="indicators"></div></div></header><main id="maincontent" data-ml-page="system"><div id="view"></div></main><div id="modal_overlay"><div class="modal"></div></div></body></html>');
 await page.setViewportSize({width,height:800});
 for(const file of ["mdc-linear-progress.css","cascade.css","design-m3.css"])await page.addStyleTag({path:base+file});
 await page.evaluate(({design,theme})=>{
  const root=document.documentElement;root.dataset.design=design;root.dataset.theme=theme;root.dataset.cards="true";
  window.MaterialAppearance={activeDesign:design};root.style.setProperty("--md-sys-color-surface-container-highest",theme==="dark"?"#333333":"#eeeeee");
  root.style.setProperty("--md-sys-color-surface-container-high",theme==="dark"?"#292929":"#fafafa");
 },{design,theme});
 for(const file of ["material-web.js","mdc-linear-progress.js","mdc-controls.js","mdc-textfield.js","runtime.js","components.js","surfaces.js","feedback.js","controls.js","wait.js"])await page.addScriptTag({path:base+file});
 await page.evaluate(()=>MaterialRuntime.start(document.body));
}
try{
 for(const [engine,type] of [["chromium",chromium],["webkit",webkit]]){
 const browser=await type.launch();
 try{for(const design of ["classic","m3e"])for(const theme of ["light","dark"])for(const width of [390,1100]){
  backend.changes={};backend.calls=[];
  const page=await browser.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
  await setup(page,design,theme,width);
  // Native readonly first paint, intermediate frame, then real delayed MDC.
  await page.evaluate(()=>document.getElementById("view").innerHTML='<div class="cbi-value"><div class="cbi-value-field"><input id="localtime" type="text" readonly value="2026-10-13 23:00:00"></div></div>');
  const initial=await page.locator("#localtime").evaluate(n=>({bg:getComputedStyle(n).backgroundColor,color:getComputedStyle(n).color,id:n.id,readonly:n.readOnly}));
  assert.equal(initial.bg,design==="m3e"?(theme==="dark"?"rgb(51, 51, 51)":"rgb(238, 238, 238)"):(theme==="dark"?"rgb(33, 33, 33)":"rgb(255, 255, 255)"));
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  assert.equal(await page.locator("#localtime").evaluate(n=>getComputedStyle(n).backgroundColor),initial.bg);
  await page.addScriptTag({path:base+"textfield.js"});
  await page.evaluate(()=>MaterialTextFields.enhance(document.getElementById("view")));
  assert.equal(await page.locator("#localtime").evaluate(n=>n.readOnly),true);
  // Both native reboot routes must take current style geometry.
  for(const legacy of [false,true]){
   await page.evaluate(legacy=>{const m=document.getElementById("maincontent");m.dataset.mlPage="reboot";m.innerHTML=legacy?'<h2>Reboot</h2><input id="reboot" type="button" class="cbi-button" value="Reboot">':'<div id="view"><button id="reboot" type="button" class="cbi-button">Reboot</button></div>';},legacy);
   assert.equal(await page.locator("#reboot").evaluate(n=>getComputedStyle(n).borderRadius),design==="m3e"?"24px":"2px");
  }
  // Actual native modal shape, dependency and tab changes keep width/min-height.
  await page.evaluate(()=>{
   maincontent.innerHTML='<div id="view"></div>';maincontent.dataset.mlPage="system";
   document.body.classList.add("modal-overlay-active");
   modal_overlay.firstElementChild.innerHTML='<h4>Mount points</h4><div class="cbi-map"><ul class="cbi-tabmenu"><li>General</li><li>Advanced</li></ul><div data-tab-title="General" data-tab-active="true" id="general"><input id="focus" value="中文 / 2001:db8::1"></div><div data-tab-title="Advanced" data-tab-active="false" id="advanced"><p>依赖字段说明 long interface alias</p><textarea rows="5"></textarea></div></div><div class="right"><button type="button">Close</button><button type="button" class="cbi-button">Save</button></div>';
  });
  const panel=page.locator("#modal_overlay>.modal"),before=await panel.boundingBox();
  await page.locator("#focus").focus();
  await page.evaluate(()=>{general.dataset.tabActive="false";advanced.dataset.tabActive="true";});
  const after=await panel.boundingBox();assert.ok(Math.abs(before.width-after.width)<1);assert.ok(Math.abs(before.height-after.height)<1);
  assert.equal(await panel.evaluate(n=>getComputedStyle(n).borderRadius),design==="m3e"?"28px":"2px");
  await page.evaluate(()=>{advanced.innerHTML+='<p>'+("Long help ".repeat(800))+'</p>';});
  assert.equal(await panel.evaluate(n=>n.scrollHeight>n.clientHeight),true);
  await panel.evaluate(n=>n.scrollTop=n.scrollHeight);
  assert.ok(await page.locator("#modal_overlay .right button").last().isVisible());
  // Reused modal short tasks: genuine official instance construction/destruction.
  await page.evaluate(()=>{
   window.progressCounts={created:0,destroyed:0};const original=MaterialComponents.progress;
   MaterialComponents.progress=function(...args){const instance=original(...args);if(args[1]?.scene==="modal"){if(!(instance instanceof MaterialMDC.MDCLinearProgress))throw Error("modal must create official MDC instance");progressCounts.created++;const destroy=instance.destroy.bind(instance);instance.destroy=()=>{progressCounts.destroyed++;destroy();};}return instance;};
  });
  for(let i=0;i<3;i++){
   await page.evaluate(()=>{modal_overlay.firstElementChild.innerHTML='<h4>Working</h4><p class="spinning">Applying</p>';MaterialWait.sync();});
   await page.waitForFunction(()=>document.querySelector("#ml-mdc-wait-progress")?.dataset.mlProgressEngine==="mdc");
   assert.equal(await page.locator("#ml-mdc-wait-progress").evaluate(n=>getComputedStyle(n).height),"4px");
   assert.equal(await page.locator("#ml-mdc-wait-progress svg").count(),0);
   assert.match(await page.locator("#ml-mdc-wait-progress .mdc-linear-progress__primary-bar").evaluate(n=>getComputedStyle(n).animationName),/indeterminate/);
   await page.evaluate(()=>{modal_overlay.firstElementChild.innerHTML='<p>Done</p>';MaterialWait.sync();});
   assert.equal(await page.locator("#ml-mdc-wait-progress").count(),0);
  }
  assert.deepEqual(await page.evaluate(()=>progressCounts),{created:3,destroyed:3});
  // Native ui.changes methods from pinned OpenWrt 21.02 source. Backend is
  // isolated HTTP memory state retained across browser reload; no router RPC.
  await page.evaluate(native=>{
   String.prototype.format=function(...args){let i=0;return this.replace(/%([sdh])/g,(_,kind)=>{const v=String(args[i++]);return kind==="h"?v.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"):v;});};
   window.E=function(tag,attrs,children){if(tag.startsWith("<")){const t=document.createElement("template");t.innerHTML=tag;return t.content.firstChild;}
    if(typeof attrs==="string"||Array.isArray(attrs)||attrs instanceof Node){children=attrs;attrs={};}const el=document.createElement(tag);
    for(const [k,v] of Object.entries(attrs||{}))if(typeof v==="function")el.addEventListener(k,v);else el.setAttribute(k,v);
    for(const child of (Array.isArray(children)?children:[children]))if(child!=null)el.append(child instanceof Node?child:document.createTextNode(child));return el;};
   const UI={prototype:{showIndicator(name,label,click){let n=document.querySelector('[data-indicator="'+name+'"]');if(!n){n=E("span",{"data-indicator":name,click},label);indicators.append(n);}else n.firstChild.data=label;},hideIndicator(name){document.querySelector('[data-indicator="'+name+'"]')?.remove();},hideModal(){document.body.classList.remove("modal-overlay-active");},showModal(title,body){const n=modal_overlay.firstElementChild;n.className="modal";n.replaceChildren(E("h4",title),...body);document.body.classList.add("modal-overlay-active");return n;}}};
   const L={bind:(fn,self,...args)=>fn.bind(self,...args)},_=v=>v;
   const changes={apply:async checked=>{await fetch("/apply",{method:"POST",body:JSON.stringify({checked})});await reloadChanges();},revert:async()=>{await fetch("/revert",{method:"POST"});await reloadChanges();}};
   for(const name of ["setIndicator","renderChangeIndicator","displayChanges"])changes[name]=new Function("E","UI","L","_","return ("+native[name]+")")(E,UI,L,_);
   changes.changeTemplates=new Function("return ("+native.changeTemplates+")")();
   window.reloadChanges=async()=>changes.renderChangeIndicator(await(await fetch("/changes")).json());window.nativeChanges=changes;
   window.savePage=async(config,change)=>{await fetch("/save",{method:"POST",body:JSON.stringify({config,change})});await reloadChanges();};
  },native);
  await page.evaluate(async()=>{await savePage("network",["set","lan","proto","dhcp"]);await savePage("system",["set","cfg01","hostname","中文Router"]);});
  await page.waitForFunction(()=>document.querySelector('[data-indicator=uci-changes]')?.tabIndex===0);
  assert.match(await page.locator("[data-indicator=uci-changes]").innerText(),/2$/);
  await page.locator("[data-indicator=uci-changes]").press("Enter");
  assert.equal(await page.locator(".uci-dialog .uci-change-list var").count(),2);
  const uciButtons=page.locator(".uci-dialog>.cbi-section>.right button");
  assert.equal(await uciButtons.count(),3);
  const positions=await uciButtons.evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
  assert.ok(positions.every(r=>r.h>=48&&r.w>0&&r.x>=0&&r.x+r.w<=width),"buttons inside viewport");
  const ink=await page.locator(".uci-change-list ins").first().evaluate(n=>({bg:getComputedStyle(n).backgroundColor,color:getComputedStyle(n).color,italic:getComputedStyle(n.parentElement).fontStyle}));
  assert.equal(ink.italic,"normal");assert.notEqual(ink.bg,ink.color);
  await uciButtons.nth(1).click();await page.waitForFunction(()=>!document.querySelector("[data-indicator=uci-changes]"));assert.equal(backend.calls[0].checked,true);
  await page.evaluate(()=>savePage("dhcp",["add","new","host"]));
  // Browser reload reconstructs native indicator from persistent isolated backend.
  await setup(page,design,theme,width);
  await page.evaluate(native=>{
   String.prototype.format=function(...args){let i=0;return this.replace(/%[sd]/g,()=>String(args[i++]));};
   window.E=(tag,attrs,label)=>{if(typeof attrs==="string"||Array.isArray(attrs)||attrs instanceof Node){label=attrs;attrs={};}const n=document.createElement(tag);for(const [k,v]of Object.entries(attrs||{}))typeof v==="function"?n.addEventListener(k,v):n.setAttribute(k,v);for(const v of (Array.isArray(label)?label:[label]))if(v!=null)n.append(v instanceof Node?v:document.createTextNode(v));return n;};
   const UI={prototype:{showIndicator(name,text,click){indicators.append(E("span",{"data-indicator":name,click},text));},hideIndicator(name){document.querySelector('[data-indicator="'+name+'"]')?.remove();}}},L={bind:(fn,self)=>fn.bind(self)},changes={displayChanges(){}};
   changes.setIndicator=new Function("E","UI","L","_","return ("+native.setIndicator+")")(E,UI,L,v=>v);
   changes.renderChangeIndicator=new Function("E","UI","L","_","return ("+native.renderChangeIndicator+")")(E,UI,L,v=>v);window.nativeChanges=changes;
  },native);
  await page.evaluate(async()=>nativeChanges.renderChangeIndicator(await(await fetch("/changes")).json()));
  assert.match(await page.locator("[data-indicator=uci-changes]").innerText(),/1$/);
  await page.evaluate(async()=>{await fetch("/revert",{method:"POST"});nativeChanges.renderChangeIndicator(await(await fetch("/changes")).json());});
  assert.equal(await page.locator("[data-indicator=uci-changes]").count(),0);
  // Table text actions, glyph removal, combobox text and meaningful SVG series.
  await page.evaluate(()=>{
   view.innerHTML='<table class="table"><tr><td><button id="edit" type="button" class="cbi-button">Edit</button><button id="remove" type="button" class="cbi-button cbi-button-negative remove">Remove</button></td></tr></table><div class="cbi-dynlist"><div class="item" tabindex="0">2001:db8::1</div><div class="add-item"><input><button class="cbi-button cbi-button-add" type="button">Add</button></div></div><div class="cbi-dropdown" open><ul class="preview"><li display="1">未指定</li></ul><ul class="dropdown"><li selected><label>long device alias 中文 / eth0.123456789</label></li></ul><span class="more">More</span><span class="open">Open</span></div><div id="plot" style="height:300px;background:#fff;border:1px solid #000"><svg width="100%" height="100%"><line style="stroke:black"/><text style="fill:#eee;text-shadow:1px 1px #000">Axis</text><polyline id="series" style="stroke:#f60;fill:#f60" points="0,0 10,20"/><g><polyline style="stroke:#f60" points="0,0 10,20"/><text id="ssid" style="fill:#f60">SSID</text></g></svg></div>';
   MaterialSurfaces.prepare();
  });
  const sizes=await page.locator("#edit,#remove").evaluateAll(ns=>ns.map(n=>({h:n.getBoundingClientRect().height,p:getComputedStyle(n).padding})));
  assert.equal(sizes[0].h,sizes[1].h);assert.equal(sizes[0].p,sizes[1].p);
  assert.equal(await page.locator(".cbi-dynlist .add-item button").evaluate(n=>n.getBoundingClientRect().height),48);
  assert.equal(await page.locator(".cbi-dynlist>.item").evaluate(n=>getComputedStyle(n,"::after").content),'""');
  assert.equal(await page.locator(".cbi-dropdown>.more").evaluate(n=>getComputedStyle(n).textShadow),"none");
  assert.equal(await page.locator("#ssid").evaluate(n=>getComputedStyle(n).fill),"rgb(255, 102, 0)");
  assert.notEqual(await page.locator("#plot").evaluate(n=>getComputedStyle(n).backgroundColor),theme==="dark"?"rgb(255, 255, 255)":"rgb(0, 0, 0)");
  const passes=await page.evaluate(()=>MaterialSurfaces.count());
  await page.evaluate(()=>{for(let i=0;i<10;i++)series.setAttribute("points","0,0 "+i+",20");});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
  assert.equal(await page.evaluate(()=>MaterialSurfaces.count()),passes);
  // Execute pinned native drag lifecycle and move callback; theme only paints state.
  await page.evaluate(sort=>{
   window.sortScope={};const scope=sortScope,dom={parent:(n,s)=>n.closest(s)};
   window.section={map:{config:"dhcp",data:{move(...args){window.moves.push(args);}}}};window.moves=[];
   for(const [name,body] of Object.entries(sort))section[name]=new Function("scope","dom","E","return ("+body+")")(scope,dom,window.E);
   view.innerHTML='<table class="table" id="sorttable"><tbody>'+["a","b","c"].map(id=>'<tr class="tr" data-sid="'+id+'" draggable="true"><td><button type="button" class="drag-handle">'+id+'</button></td></tr>').join("")+'</tbody></table>';
   const rows=sorttable.querySelectorAll(".tr"),source=rows[0],target=rows[2],event={target:source,currentTarget:target,clientY:target.getBoundingClientRect().bottom,dataTransfer:{setData(){},dropEffect:""},preventDefault(){},stopPropagation(){}};
   scope.dragState={node:source.querySelector(".drag-handle")};section.handleDragStart(event);section.handleDragEnter(event);section.handleDragOver(event);
  },sort);
  assert.equal(await page.locator("#sorttable .drag-over-below").count(),1);
  assert.notEqual(await page.locator("#sorttable .drag-over-below td").evaluate(n=>getComputedStyle(n).boxShadow),"none");
  await page.evaluate(()=>{const source=sorttable.querySelector('[data-sid=a]');section.handleDrop({target:source,stopPropagation(){},preventDefault(){}});section.handleDragEnd({target:source});});
  assert.deepEqual(await page.locator("#sorttable .tr").evaluateAll(ns=>ns.map(n=>n.dataset.sid)),["b","c","a"]);
  assert.deepEqual(await page.evaluate(()=>moves),[["dhcp","a","c",true]]);
  assert.equal(await page.locator(".drag-over-above,.drag-over-below").count(),0);

  // Synthetic native touch method execution (not a physical-device trace).
  await page.evaluate(()=>{
   const rows=sorttable.querySelectorAll(".tr"),button=rows[0].querySelector(".drag-handle"),target=rows[2],r=target.getBoundingClientRect();
   section.handleTouchMove({target:button,targetTouches:[{pageY:r.bottom-3,clientY:r.bottom-3}]});
  });
  assert.equal(await page.locator(".touchsort-element").count(),1);
  assert.equal(await page.locator(".touchsort-element").evaluate(n=>getComputedStyle(n).pointerEvents),"none");
  await page.evaluate(()=>section.handleTouchEnd({target:sorttable.querySelector(".tr .drag-handle")}));
  assert.equal(await page.locator(".touchsort-element").count(),0);
  await page.screenshot({path:"dist/ui-refinement/coverage-"+engine+"-"+design+"-"+theme+"-"+width+".png",fullPage:true});
  assert.deepEqual(errors,[]);
  results.push({engine,design,theme,width,initialReadonly:initial,modalBefore:before,modalAfter:after,buttons:sizes,progress:{created:3,destroyed:3},chartOwnerPasses:passes,environment:await page.evaluate(()=>({dpr:devicePixelRatio,scale:visualViewport.scale,font:getComputedStyle(document.body).fontFamily})),scope:"Pinned native changes/desktop drag methods and isolated HTTP backend; not firmware apply/touch/Safari device acceptance"});
  await page.close();
 }}finally{await browser.close();}
 }
}finally{server.close();fs.mkdirSync("dist/ui-refinement",{recursive:true});fs.writeFileSync("dist/ui-refinement/coverage.json",JSON.stringify(results,null,2));}
console.log(JSON.stringify(results));
