'use strict';
'require view';
'require fs';
'require view.materialluci-native-reboot as rebootRenderer';
'require view.materialluci-native-flash as flashRenderer';
/* Real upstream renderers, deterministic data; no device RPC or writes. */
return view.extend({
 render:function(){
  window.maintenanceCalls=[];
  var record=function(){var ev=arguments[arguments.length-1];maintenanceCalls.push(ev.currentTarget.textContent.trim());};
  rebootRenderer.handleReboot=record;
  for(var key of ['handleBackup','handleFirstboot','handleRestore','handleBlock','handleSysupgrade','handleBackupList','handleBackupSave'])flashRenderer[key]=record;
  fs.read=function(path){if(path==='/etc/sysupgrade.conf')return Promise.resolve('/etc/config/*\n');return Promise.reject(new Error('Unexpected fixture read: '+path));};
  fs.exec=function(){return Promise.reject(new Error('Device writes prohibited in maintenance fixture'));};
  fs.write=fs.exec;
  if(window.maintenanceKind==='reboot')return rebootRenderer.render({network:[]});
  return flashRenderer.render([{type:'file'},'AX3000T',
   'mtd0: 00100000 00020000 "boot"\nmtd1: 02000000 00020000 "firmware"\nmtd2: 00200000 00020000 "rootfs_data"\n',
   '', 'overlayfs:/overlay / overlay rw 0 0']);
 },
 handleSaveApply:null,handleSave:null,handleReset:null
});
