#!/usr/bin/env python3
"""Build and verify an OpenWrt 21.02 resource-only IPK for the AX3000T."""
import io, json, tarfile, gzip, pathlib, shutil, subprocess, os, hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
meta=json.loads((ROOT/"theme/package.json").read_text())
assert meta["architecture"]=="aarch64_cortex-a53" and meta["target"]=="mediatek/mt7981"
stage=ROOT/"build/stage"
if stage.exists(): shutil.rmtree(stage)
shutil.copytree(ROOT/"theme/root",stage)
# A single source of truth also invalidates browser caches on package upgrades.
version=meta["version"].rsplit("-",1)[0]
epoch=int(os.environ.get("SOURCE_DATE_EPOCH","1791558000"))
commit=os.environ.get("GITHUB_SHA") or subprocess.check_output(["git","rev-parse","HEAD"],cwd=ROOT,text=True).strip()
cache=meta["version"]+"-"+commit[:12]
menu_class="materialluci-menu-v"+version.replace(".","_")+"-"+str(epoch)
for file in stage.rglob("*"):
 if file.is_file() and file.suffix in (".htm",".js"):
  file.write_text(file.read_text().replace("@COMMIT@",commit).replace("@VERSION@",version).replace("@CACHE@",cache).replace("@MENU_CLASS@",menu_class))
# LuCI uses firmware resource_version for class URLs. A unique theme module
# name prevents a cached old menu adapter from talking to a new app shell.
resource_dir=stage/"www/luci-static/resources"
(resource_dir/"materialluci-menu.js").rename(resource_dir/(menu_class+".js"))
assets=stage/"www/luci-static/materialluci"
css=(assets/"base.css").read_text()+(assets/"cascade.css").read_text().replace('@import url("base.css");',"")
(assets/"cascade.css").write_text(css);(assets/"base.css").unlink()
for name in ("palette","startup","feedback","textfield","app","wait"):
 subprocess.run([str(ROOT/"node_modules/.bin/esbuild"),str(assets/(name+".js")),"--minify","--target=es2020","--outfile="+str(assets/(name+".min.js"))],check=True)
 (assets/(name+".js")).unlink();(assets/(name+".min.js")).rename(assets/(name+".js"))
# Only the official linear-progress package and required helpers are bundled.
subprocess.run([str(ROOT/"node_modules/.bin/esbuild"),str(ROOT/"theme/mdc-entry.js"),
 "--bundle","--minify","--format=iife","--global-name=MaterialMDC","--target=es2020",
 "--outfile="+str(assets/"mdc-linear-progress.js")],check=True)
subprocess.run([str(ROOT/"node_modules/.bin/esbuild"),str(ROOT/"theme/mdc-switch-entry.js"),
 "--bundle","--minify","--format=iife","--global-name=MaterialMDCSwitch","--target=es2020",
 "--outfile="+str(assets/"mdc-switch.js")],check=True)
subprocess.run([str(ROOT/"node_modules/.bin/esbuild"),str(ROOT/"theme/mdc-textfield-entry.js"),
 "--bundle","--minify","--format=iife","--global-name=MaterialMDCTextField","--target=es2020",
 "--outfile="+str(assets/"mdc-textfield.js")],check=True)
subprocess.run([str(ROOT/"node_modules/.bin/sass"),"--load-path="+str(ROOT/"node_modules"),
 "--style=compressed","--no-source-map","--quiet-deps",str(ROOT/"theme/mdc.scss"),
 str(assets/"mdc-linear-progress.css")],check=True)
notice=stage/"usr/share/doc/luci-theme-materialluci";notice.mkdir(parents=True)
shutil.copy(ROOT/"licenses/MDC-Web-MIT.txt",notice/"MDC-Web-MIT.txt")
# tslib is a small transitive runtime helper. Preserve its shipped notices too.
for filename in ("LICENSE.txt","CopyrightNotice.txt"):
 license_file=ROOT/"node_modules/tslib"/filename
 if license_file.exists():shutil.copy(license_file,notice/("tslib-"+filename))
for name in ("LICENSE","NOTICE"): shutil.copy(ROOT/name,notice/name)
(stage/"etc/uci-defaults/95-materialluci").chmod(0o755)
epoch=int(os.environ.get("SOURCE_DATE_EPOCH","1791558000"))
def archive(items,directories=()):
 buf=io.BytesIO()
 with tarfile.open(fileobj=buf,mode="w",format=tarfile.GNU_FORMAT) as tar:
  for name,mode in sorted(directories,key=lambda item:(item[0].count("/"),item[0])):
   info=tarfile.TarInfo("./"+name.rstrip("/")+"/");info.type=tarfile.DIRTYPE;info.size=0;info.mode=mode
   info.uid=info.gid=0;info.uname=info.gname="root";info.mtime=epoch
   tar.addfile(info)
  for name,data,mode in sorted(items):
   info=tarfile.TarInfo("./"+name);info.size=len(data);info.mode=mode
   info.uid=info.gid=0;info.uname=info.gname="root";info.mtime=epoch
   tar.addfile(info,io.BytesIO(data))
 return gzip.compress(buf.getvalue(),mtime=0)
identity={"commit":commit,"cache":cache,"run_id":os.environ.get("GITHUB_RUN_ID"),
 "files":{str(p.relative_to(stage)):hashlib.sha256(p.read_bytes()).hexdigest() for p in stage.rglob("*") if p.is_file() and p.suffix in (".js",".css",".svg",".htm")}}
(assets/"build.json").write_text(json.dumps(identity,sort_keys=True))
items=[(str(p.relative_to(stage)),p.read_bytes(),p.stat().st_mode&0o777) for p in stage.rglob("*") if p.is_file()]
directories=[(str(p.relative_to(stage)),p.stat().st_mode&0o777) for p in stage.rglob("*") if p.is_dir()]
size=sum(len(data) for _,data,_ in items)
control="\n".join([
 "Package: "+meta["name"],"Version: "+meta["version"],"Architecture: "+meta["architecture"],
 "Maintainer: Patrick <Pew2018@users.noreply.github.com>","Section: luci","Priority: optional",
 "Depends: "+meta["dependencies"],"Installed-Size: "+str(size),
 "Description: "+meta["description"]+"\n Classic local theme; Lua LuCI 21.02 compatible.",""
]).encode()
controls=[("control",control,0o644)]+[(p.name,p.read_bytes(),0o755) for p in (ROOT/"theme/control").iterdir()]
data=archive(items,directories);ctrl=archive(controls)
out=ROOT/"dist";out.mkdir(exist_ok=True)
for child in out.iterdir():
 if child.is_file(): child.unlink()
name=meta["name"]+"_"+meta["version"]+"_"+meta["architecture"]+".ipk"
ipk=archive([("debian-binary",b"2.0\n",0o644),("data.tar.gz",data,0o644),("control.tar.gz",ctrl,0o644)])
(out/name).write_bytes(ipk)
# Verify IPK structure, metadata, allowlisted payload, and every parent directory.
outer=tarfile.open(fileobj=io.BytesIO(ipk))
assert sorted(n.removeprefix("./") for n in outer.getnames())==["control.tar.gz","data.tar.gz","debian-binary"]
c=tarfile.open(fileobj=io.BytesIO(outer.extractfile("./control.tar.gz").read()))
assert b"Architecture: aarch64_cortex-a53\n" in c.extractfile("./control").read()
d=tarfile.open(fileobj=io.BytesIO(outer.extractfile("./data.tar.gz").read()))
allowed=("www/luci-static/materialluci/","www/luci-static/resources/"+menu_class+".js","usr/lib/lua/luci/view/themes/materialluci/","etc/uci-defaults/95-materialluci","usr/share/doc/luci-theme-materialluci/")
members=list(d)
actual_dirs={m.name.removeprefix("./").rstrip("/") for m in members if m.isdir()}
actual_files={m.name.removeprefix("./") for m in members if m.isfile()}
assert actual_files=={name for name,_,_ in items}
for member in members:
 n=member.name.removeprefix("./").rstrip("/") if member.isdir() else member.name.removeprefix("./")
 assert ".." not in pathlib.PurePosixPath(n).parts
 assert member.isdir() or member.isfile()
 assert any(n==root.rstrip("/") or n.startswith(root) or (member.isdir() and root.rstrip("/").startswith(n+"/")) for root in allowed),n
 for parent in pathlib.PurePosixPath(n).parents:
  if str(parent)!=".":
   assert str(parent) in actual_dirs, f"missing parent directory entry: {parent} for {n}"
assert len(actual_dirs)==len([m for m in members if m.isdir()])
print(json.dumps({"file":name,"bytes":len(ipk),"files":len(items),"directoryEntries":len(directories)}))
