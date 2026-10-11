'use strict';
'require view';
'require uci';
'require poll';
'require form';
'require fs';
'require tools.widgets as widgets';
'require view.materialluci-native-system as systemRenderer';
'require view.materialluci-native-sshkeys as sshRenderer';
// Actual pinned upstream renderers; only data and device operations are mocked.
return view.extend({
 render:function(){
  window.systemFixtureCalls=[];
  fs.write=function(){systemFixtureCalls.push('write');return Promise.reject(new Error('Device writes prohibited in fixture'));};
  if(window.systemFixtureKind==='sshkeys')return sshRenderer.render([]);
  uci.state.values.system={cfg01:{'.name':'cfg01','.type':'system','.index':0,hostname:'AX3000T',notes:'Retained notes',zonename:'UTC',log_size:'64',zram_size_mb:'32'},ntp:{'.name':'ntp','.type':'timeserver','.index':1,server:['0.openwrt.pool.ntp.org','1.openwrt.pool.ntp.org']}};
  uci.state.values.luci={main:{'.name':'main','.type':'core','.index':0,lang:'auto',mediaurlbase:'/luci-static/materialluci'},languages:{'.name':'languages','.type':'internal','.index':1,en:'English'},themes:{'.name':'themes','.type':'internal','.index':2,MaterialLuCI:'/luci-static/materialluci'}};
  L.hasSystemFeature=function(name){return name==='zram'||name==='sysntpd';};
  // Network discovery is unrelated to system geometry and would require RPC.
  widgets.NetworkSelect=form.Value;poll.add=function(){};
  return systemRenderer.render([1,{'Asia/Shanghai':{tzstring:'CST-8'}},1700000000]);
 },
 handleSaveApply:null,handleSave:null,handleReset:null
});
