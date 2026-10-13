'use strict';
'require view';
'require form';
'require ui';
'require dom';
return view.extend({
 load: function() { return fetch('/contract-ready'); },
 render: function() {
  var m = new form.JSONMap({theme:{hostname:'router',enabled:'1',dns:['192.0.2.1'],notes:'notes',mode:'a'}});
  var s=m.section(form.NamedSection,'theme','theme','Modern LuCI');
  s.tab('general','General');s.tab('extra','Extra');
  window.contractName=s.taboption('general',form.Value,'hostname','Hostname');contractName.datatype='hostname';
  window.contractFlag=s.taboption('general',form.Flag,'enabled','Enabled');
  window.contractList=s.taboption('general',form.DynamicList,'dns','DNS');contractList.datatype='ipaddr';
  window.contractSelect=s.taboption('general',form.ListValue,'mode','Mode');contractSelect.value('a','Alpha');contractSelect.value('b','Beta');
  s.taboption('extra',form.TextValue,'notes','Notes');
  var nested=s.taboption('extra',form.SectionValue,'nested',form.NamedSection,'theme','theme','Nested section');
  nested.subsection.option(form.Value,'nested_value','Nested value');
  window.contractMap=m;
  return m.render().then(function(node) {
   var fieldset=E('fieldset',{id:'contract-fieldset'},E('input',{id:'contract-field',name:'original',value:'initial',type:'text'}));
   var f=E('form',{id:'contract-native-form'},[fieldset,E('input',{type:'reset',id:'contract-reset',value:'Reset'})]);
   var select=E('select',{id:'contract-native-select',name:'select'},[E('option',{value:'a'},'Alpha'),E('option',{value:'b'},'Beta')]);
   var radio=E('input',{id:'contract-radio',type:'radio',name:'native_radio',value:'native'});
   f.append(select,radio);
   window.contractResetCount=0;f.addEventListener('reset',()=>contractResetCount++);
   var table=E('table',{id:'contract-table',class:'table'},E('tr',{class:'tr'},E('td',{class:'td'},'Sample')));
   return E('div',{},[node,f,E('div',{class:'cbi-section',id:'contract-table-owner'},table)]);
  });
 },
 handleSaveApply:null, handleSave:null,
 handleReset:function(){return this.render().then(nodes=>dom.content(document.getElementById('view'),nodes));}
});
