'use strict';
'require view';
'require form';
'require uci';
'require view.status.include.30_network as networkStatus';
'require view.status.include.60_wifi as wifiStatus';
/* Compatibility fixture: pinned upstream renderers, deterministic read-only
   device data. This is not a connected router or an iPhone Safari test. */
function badge(icon,title) {
 var pairs=Array.prototype.slice.call(arguments,2);
 return E('span',{class:'ifacebadge'},[
  E('img',{src:icon,title:title||''}),L.itemlist(E('span'),pairs)
 ]);
}
return view.extend({
 load:function(){return fetch('/preview-ready').then(function(){return null;});},
 render:function(){
  window.renderBadge=badge;
  var dev={getType:()=> 'ethernet',getI18n:()=> 'eth0',getMAC:()=> '02:00:00:00:00:01'};
  var wan={getL3Device:()=>dev,getProtocol:()=> 'dhcp',getIPAddrs:()=>['172.27.77.121/20'],getDNSAddrs:()=>['223.5.5.5'],getExpiry:()=>3600,getUptime:()=>300,getI18n:()=> 'DHCP client',getGatewayAddr:()=> '172.27.79.254'};
  var radio={getName:()=> 'radio0',getI18n:()=> 'MT7981 Wireless Controller',isUp:()=>true};
  var net={sid:'wlan0',assoclist:[{mac:'02:00:00:00:00:02',signal:-42,noise:-95,rx:{rate:144000,mhz:40},tx:{rate:144000,mhz:40}}],
   getWifiDeviceName:()=> 'radio0',getBSSID:()=> '02:00:00:00:00:03',getChannel:()=>6,isDisabled:()=>false,
   getSignalPercent:()=>85,getSignal:()=>-42,getActiveSSID:()=> 'MaterialLuCI test',getActiveMode:()=> 'Master',
   getActiveBSSID:()=> '02:00:00:00:00:03',getActiveEncryption:()=> 'WPA2',getFrequency:()=>2.437,getBitRate:()=>144,
   getIfname:()=> 'wlan0',getI18n:()=> 'MT7981',getShortName:()=> 'wlan0',isClientDisconnectSupported:()=>false};
  var hints={getHostnameByMACAddr:()=> 'test station',getIPAddrByMACAddr:()=> '192.0.2.2',getIP6AddrByMACAddr:()=>null};
  var m=new form.JSONMap({theme:{'.type':'theme',_mediaurlbase:'/luci-static/materialluci',enabled:'1',hostname:'AX3000T',password:'secret',notes:'LuCI textarea',servers:['192.0.2.1']}},'Theme settings');
  var s=m.section(form.NamedSection,'theme','theme','Language and Style');
  var language=s.option(form.ListValue,'lang','语言');
  language.value('auto','自动');language.value('zh_cn','简体中文 (Chinese Simplified)');
  var design=s.option(form.ListValue,'_mediaurlbase','Design');
  design.value('/luci-static/materialluci','MaterialLuCI');
  var flag=s.option(form.Flag,'enabled','Enabled');
  window.previewName=s.option(form.Value,'hostname','设备名称');window.previewName.datatype='hostname';
  window.previewPassword=s.option(form.Value,'password','密码');window.previewPassword.password=true;
  window.previewTextarea=s.option(form.TextValue,'notes','说明');window.previewTextarea.rows=3;
  window.previewList=s.option(form.DynamicList,'servers','DNS 服务器');window.previewList.datatype='ipaddr';
  var reset=s.option(form.Button,'reset','恢复到出厂设置');reset.inputstyle='negative important';reset.inputtitle='执行重置';
  // Visual compatibility fixture only; never execute firstboot or any RPC.
  reset.onclick=function(){window.resetPreviewClicks=(window.resetPreviewClicks||0)+1;};
  window.previewMap=m;
  return m.render().then(function(settings){
   window.previewRendered=true;
   return E('div',{},[
    settings,
    E('section',{class:'cbi-section',id:'upstream-network'},[E('h3','Network'),networkStatus.render(['12','100',[wan],[]])]),
    E('section',{class:'cbi-section',id:'upstream-wireless'},[E('h3','Wireless'),wifiStatus.render([[radio],[net],hints,true,false])])
   ]);
  });
 },
 handleSaveApply:null,handleSave:null,handleReset:null
});
