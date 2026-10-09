'use strict';
'require baseclass';
'require ui';
return baseclass.extend({
 __init__: function(){ui.menu.load().then(L.bind(this.render,this)).catch(function(e){if(window.MaterialLuCI)window.MaterialLuCI.menuFailed(e);});},
 render:function(tree){
  var groups={status:[],network:[],settings:[]},children=ui.menu.getChildren(tree),mode=null;
  for(var i=0;i<children.length;i++)if(children[i].name===(L.env.requestpath[0]||'admin'))mode=children[i];
  if(!mode&&children.length)mode=children[0];if(!mode)return;
  function entries(parent,path){return ui.menu.getChildren(parent).map(function(child){var next=path.concat(child.name),sub=entries(child,next);return {title:_(child.title||child.name),url:L.url.apply(L,next),children:sub,active:L.env.dispatchpath.slice(0,next.length).join('/')===next.join('/')};});}
  var top=ui.menu.getChildren(mode);
  top.forEach(function(child){var group=child.name==='status'?'status':child.name==='network'?'network':'settings';var sub=entries(child,[mode.name,child.name]);groups[group].push({title:_(child.title||child.name),url:L.url(mode.name,child.name),children:sub,active:L.env.dispatchpath[1]===child.name});});
  var current=L.env.dispatchpath[1],group=current==='status'?'status':current==='network'?'network':'settings';
  if(window.MaterialLuCI)window.MaterialLuCI.setMenus(groups,group);
  this.renderTabs(tree);
 },
 renderTabs:function(tree){
  var container=document.getElementById('tabmenu'),path=L.env.dispatchpath,node=tree;
  for(var i=0;i<3&&node;i++)node=node.children&&node.children[path[i]];
  var url=path.slice(0,3);container.textContent='';
  while(node){var children=ui.menu.getChildren(node);if(!children.length)break;
   var ul=E('ul',{'class':'tabs'}),active=null;
   children.forEach(function(child){var isActive=path[url.length]===child.name;ul.appendChild(E('li',{'class':isActive?'active':''},[E('a',{'href':L.url.apply(L,url.concat(child.name))},[_(child.title||child.name)])]));if(isActive)active=child;});
   container.appendChild(ul);if(!active)break;url.push(active.name);node=active;
  }container.hidden=!container.children.length;
  if(window.MaterialFeedback)window.MaterialFeedback.bind(container);
 }
});
