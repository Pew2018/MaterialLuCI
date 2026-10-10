#!/usr/bin/env python3
"""Compile real theme templates in Lua 5.1 with explicit fixture globals.
Browser tests use pinned upstream LuCI JS; only menu/RPC responses are mocked.
"""
import pathlib,re,json,subprocess,shutil
ROOT=pathlib.Path(__file__).resolve().parents[1]
output=ROOT/"build/preview"
if output.exists():shutil.rmtree(output)
shutil.copytree(ROOT/"build/unpacked/www",output)
upstream=ROOT/"luci-fixture/modules/luci-base/htdocs/luci-static/resources"
shutil.copytree(upstream,output/"luci-static/resources",dirs_exist_ok=True)
for module in (ROOT/"build/unpacked/www/luci-static/resources").glob("materialluci-menu*.js"):
 shutil.copy(module,output/"luci-static/resources"/module.name)
def luaquote(s):return json.dumps(s,ensure_ascii=False)
def compile_template(text):
 result=[];pos=0
 for m in re.finditer(r"<%(.*?)%>",text,re.S):
  result.append("write("+luaquote(text[pos:m.start()])+")")
  block=m.group(1)
  if block.startswith("#"):pass
  else:
   block=block.strip()
   if block.endswith("-"):block=block[:-1]
   if block.startswith("-"):block=block[1:]
   if block.startswith("="):result.append("write("+block[1:]+")")
   elif block.startswith(":"):result.append("write(translate("+luaquote(block[1:])+"))")
   elif block.startswith("+"):result.append("include("+luaquote(block[1:])+ ")")
   else:result.append(block)
  pos=m.end()
 result.append("write("+luaquote(text[pos:])+")")
 return "\n".join(result)
templates=ROOT/"build/unpacked/usr/lib/lua/luci/view/themes/materialluci"
compiled={p.stem:compile_template(p.read_text()) for p in templates.glob("*.htm")}
bootstrap=r'''
local function escape(s)
 return tostring(s or ""):gsub("&","&amp;"):gsub("<","&lt;"):gsub(">","&gt;"):gsub('"',"&quot;")
end
pcdata=escape
striptags=function(s)return tostring(s):gsub("<[^>]*>","")end
translate=function(s)
 local t={Status="状态",Network="网络",Settings="设置",Back="返回",Menu="菜单",Appearance="界面外观",Navigation="导航",Username="用户名",Password="密码",Login="登录",Reset="重置",["Authorization Required"]="登录",["Please enter your username and password."]="请输入用户名和密码。"}
 return t[s] or s
end
luci={i18n={context={lang="zh"}}}
local sys={process={info=function()return 0 end},user={getuser=function()return {} end,getpasswd=function()return "fixture" end}}
local disp={context={dispatched={title="状态"},requestpath={"admin","status","overview"}},lookup=function()return true end}
local util={ubus=function()return {hostname="AX3000T"}end}
local mods={
 ["luci.sys"]=sys,["luci.util"]=util,["luci.http"]={prepare_content=function()end},
 ["luci.dispatcher"]=disp,["luci.version"]={distversion="ImmortalWrt 21.02 · 预览示例"},
 ["luci.model.uci"]={cursor=function()return {get=function()return nil end}end},
 ["nixio.fs"]={access=function()return false end}
}
require=function(name)assert(mods[name],name);return mods[name]end
media="/luci-static/materialluci"
resource="/luci-static/resources"
url=function(path)return "/cgi-bin/luci/"..path end
FULL_REQUEST_URI="/login.html";duser="root";fuser=nil
write=function(s)io.write(tostring(s or ""))end
local templates={}
'''
for name,source in compiled.items():bootstrap+="\ntemplates["+luaquote(name)+"]=function()\n"+source+"\nend\n"
bootstrap+="\ninclude=function(name)templates[name]()end\n"
renderer=ROOT/"build/render.lua";renderer.write_text(bootstrap)
subprocess.run(["luac5.1","-p",str(renderer)],check=True)
sample=ROOT/"ci/sample.html"
env={"base_url":"/luci-static/resources","scriptname":"/cgi-bin/luci","resource":"/luci-static/resources","documentroot":"/www","media":"/luci-static/materialluci","ubuspath":"/ubus","sessionid":"0"*32,"requestpath":["admin","status","overview"],"dispatchpath":["admin","status","overview"],"nodespec":{"satisfied":True,"readonly":False}}
runtime='<script src="/luci-static/resources/luci.js"></script><script>window._=s=>s;window.L=new LuCI('+json.dumps(env)+');</script>'
for login in (False,True):
 code=bootstrap+('\ninclude("sysauth")' if login else '\ninclude("header")\nwrite('+luaquote(sample.read_text())+')\ninclude("footer")')
 renderer.write_text(code)
 html=subprocess.check_output(["lua5.1",str(renderer)]).decode()
 html=html.replace("</head>",runtime+"</head>")
 (output/("login.html" if login else "index.html")).write_text(html)
print("Compiled and rendered all Lua templates; prepared real LuCI JS fixture.")

# Same compiled templates and content, with network dispatch tabs selected.
network_env=dict(env)
network_env["requestpath"]=["admin","network","network","devices"]
network_env["dispatchpath"]=["admin","network","network","devices"]
index=(output/"index.html").read_text()
(output/"network.html").write_text(index.replace(json.dumps(env),json.dumps(network_env)))

# Render the actual pinned upstream opkg view, including its injected CSS.
opkg_env=dict(env)
opkg_env["requestpath"]=["admin","system","opkg"]
opkg_env["dispatchpath"]=["admin","system","opkg"]
opkg_source=ROOT/"luci-fixture/applications/luci-app-opkg/htdocs/luci-static/resources/view/opkg.js"
view_dir=output/"luci-static/resources/view"
view_dir.mkdir(parents=True,exist_ok=True)
shutil.copy(opkg_source,view_dir/"opkg.js")
available="".join("Package: fixture-package-%02d\nVersion: 1.0-1\nSize: 1234\nDescription: Example package description for layout verification.\n\n"%i for i in range(12))
installed="Package: fixture-package-00\nVersion: 1.0-1\nStatus: install ok installed\n\n"
opkg_fixture='<div id="view"><p>Loading package view</p></div><script>document.addEventListener("DOMContentLoaded",function(){L.require("fs").then(function(fs){fs.exec_direct=function(path,args){if(path==="/usr/libexec/opkg-call"&&args[0]==="list-available")return Promise.resolve('+json.dumps(available)+');if(path==="/usr/libexec/opkg-call"&&args[0]==="list-installed")return Promise.resolve('+json.dumps(installed)+');return Promise.reject(new Error("Unexpected write in opkg fixture"));};return L.require("view.opkg");});});</script>'
code=bootstrap+'\ninclude("header")\nwrite('+luaquote(opkg_fixture)+')\ninclude("footer")'
renderer.write_text(code)
html=subprocess.check_output(["lua5.1",str(renderer)]).decode()
html=html.replace("</head>",runtime.replace(json.dumps(env),json.dumps(opkg_env))+"</head>")
(output/"opkg.html").write_text(html)

# Actual upstream network/wireless renderers and realtime load view, with
# deterministic read-only data. Theme assets always come from the IPK.
status=ROOT/"luci-fixture/modules/luci-mod-status/htdocs/luci-static/resources"
shutil.copytree(status,output/"luci-static/resources",dirs_exist_ok=True)
shutil.copy(ROOT/"ci/upstream-view.js",view_dir/"materialluci-preview.js")
fixture='<div id="view"></div><script>document.addEventListener("DOMContentLoaded",function(){L.require("ui").then(function(ui){Object.getPrototypeOf(L).itemlist=ui.itemlist;ui.instantiateView("materialluci-preview");});});</script>'
code=bootstrap+'\ninclude("header")\nwrite('+luaquote(fixture)+')\ninclude("footer")'
renderer.write_text(code)
html=subprocess.check_output(["lua5.1",str(renderer)]).decode().replace("</head>",runtime+"</head>")
(output/"upstream.html").write_text(html)
fixture='<div id="view"></div><script>document.addEventListener("DOMContentLoaded",function(){L.require("ui").then(function(ui){Object.getPrototypeOf(L).itemlist=ui.itemlist;ui.instantiateView("status/load");});});</script>'
code=bootstrap+'\ninclude("header")\nwrite('+luaquote(fixture)+')\ninclude("footer")'
renderer.write_text(code)
html=subprocess.check_output(["lua5.1",str(renderer)]).decode().replace("</head>",runtime+"</head>")
(output/"realtime.html").write_text(html)

# Actual pinned system renderers, with the lifecycle replaced by baseclass
# only in CI. No load/execute methods touch a device; handlers are local spies.
system=ROOT/"luci-fixture/modules/luci-mod-system/htdocs/luci-static/resources"
shutil.copytree(system,output/"luci-static/resources",dirs_exist_ok=True)
for name in ("reboot","flash"):
 source=(system/("view/system/"+name+".js")).read_text()
 assert "'require view';" in source
 source=source.replace("'require view';","'require baseclass as view';",1)
 (view_dir/("materialluci-native-"+name+".js")).write_text(source)
shutil.copy(ROOT/"ci/maintenance-view.js",view_dir/"materialluci-maintenance.js")
for name in ("reboot","flash"):
 maintenance_env=dict(env)
 maintenance_env["requestpath"]=["admin","system",name]
 maintenance_env["dispatchpath"]=["admin","system",name]
 fixture='<div id="view"></div><script>window.maintenanceKind='+json.dumps(name)+';document.addEventListener("DOMContentLoaded",function(){L.require("ui").then(function(ui){ui.instantiateView("materialluci-maintenance");});});</script>'
 code=bootstrap+'\ninclude("header")\nwrite('+luaquote(fixture)+')\ninclude("footer")'
 renderer.write_text(code)
 html=subprocess.check_output(["lua5.1",str(renderer)]).decode().replace("</head>",runtime.replace(json.dumps(env),json.dumps(maintenance_env))+"</head>")
 (output/(name+".html")).write_text(html)
