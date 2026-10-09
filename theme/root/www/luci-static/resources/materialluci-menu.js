'use strict';
'require baseclass';
'require ui';
return baseclass.extend({
 __init__:function(){ui.menu.load().then(L.bind(this.render,this)).catch(function(e){if(window.MaterialLuCI)MaterialLuCI.menuFailed(e);});},
 render:function(tree){
  var path=Array.isArray(L.env.dispatchpath)&&L.env.dispatchpath.length?L.env.dispatchpath:
   Array.isArray(L.env.requestpath)?L.env.requestpath:[];
  var children=ui.menu.getChildren(tree),mode=null;
  for(var i=0;i<children.length;i++)if(children[i].name===(path[0]||'admin'))mode=children[i];
  if(!mode&&children.length)mode=children[0];if(!mode)return;
  // Preserve LuCI ordering, ACL visibility, names and destinations. Only the
  // first two navigation levels enter the drawer; page tabs stay in tabmenu.
  function entry(child,parent,depth){
   var next=parent.concat(child.name);
   return {title:_(child.title||child.name),url:L.url.apply(L,next),
    active:path.slice(0,next.length).join('/')===next.join('/'),
    children:depth?ui.menu.getChildren(child).map(function(c){return entry(c,next,depth-1);}):[]};
  }
  var entries=ui.menu.getChildren(mode).map(function(child){return entry(child,[mode.name],1);});
  if(window.MaterialLuCI)MaterialLuCI.setMenus(entries);
  this.renderTabs(tree,path);
 },
 renderTabs:function(tree,path){
  var container=document.getElementById('tabmenu'),node=tree;
  path=Array.isArray(path)?path:[];
  if(!container)return;
  for(var i=0;i<3&&node;i++)node=node.children&&node.children[path[i]];
  var url=path.slice(0,3);container.textContent='';
  while(node){var children=ui.menu.getChildren(node);if(!children.length)break;
   var ul=E('ul',{'class':'tabs'}),active=null;
   children.forEach(function(child){var isActive=path[url.length]===child.name;
    ul.appendChild(E('li',{'class':isActive?'active':''},[E('a',{'href':L.url.apply(L,url.concat(child.name))},[_(child.title||child.name)])]));
    if(isActive)active=child;
   });
   container.appendChild(ul);if(!active)break;url.push(active.name);node=active;
  }
  container.hidden=!container.children.length;
  if(window.MaterialFeedback)MaterialFeedback.bind(container);
 }
});
