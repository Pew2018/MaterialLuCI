#!/usr/bin/env python3
"""Build an OpenWrt-format resource-only IPK for the user's aarch64 target.
No firmware/ELF cross compilation is necessary: files are Lua templates and web assets.
Uses the same gzip/tar container layout as OpenWrt 21.02 scripts/ipkg-build.
"""
import io, json, tarfile, gzip, hashlib, pathlib, shutil, subprocess, os
ROOT=pathlib.Path(__file__).resolve().parents[1]
meta=json.loads((ROOT/"theme/package.json").read_text())
assert meta["architecture"]=="aarch64_cortex-a53" and meta["target"]=="mediatek/mt7981"
stage=ROOT/"build/stage"
if stage.exists(): shutil.rmtree(stage)
shutil.copytree(ROOT/"theme/root",stage)
assets=stage/"www/luci-static/materialluci"
css=(assets/"base.css").read_text()+(assets/"cascade.css").read_text().replace('@import url("base.css");',"")
(assets/"cascade.css").write_text(css);(assets/"base.css").unlink()
for name in ("palette","startup","feedback","app"):
 subprocess.run([str(ROOT/"node_modules/.bin/esbuild"),str(assets/(name+".js")),"--minify","--target=es2020","--outfile="+str(assets/(name+".min.js"))],check=True)
 (assets/(name+".js")).unlink();(assets/(name+".min.js")).rename(assets/(name+".js"))
notice=stage/"usr/share/doc/luci-theme-materialluci";notice.mkdir(parents=True)
for name in ("LICENSE","NOTICE"): shutil.copy(ROOT/name,notice/name)
(stage/"etc/uci-defaults/95-materialluci").chmod(0o755)
epoch=int(os.environ.get("SOURCE_DATE_EPOCH","1791558000"))
def archive(items):
 buf=io.BytesIO()
 with tarfile.open(fileobj=buf,mode="w",format=tarfile.GNU_FORMAT) as tar:
  for name,data,mode in sorted(items):
   info=tarfile.TarInfo("./"+name);info.size=len(data);info.mode=mode;info.uid=info.gid=0;info.uname=info.gname="root";info.mtime=epoch
   tar.addfile(info,io.BytesIO(data))
 return gzip.compress(buf.getvalue(),mtime=0)
items=[(str(p.relative_to(stage)),p.read_bytes(),p.stat().st_mode&0o777) for p in stage.rglob("*") if p.is_file()]
size=sum(len(data) for _,data,_ in items)
control="\n".join([
 "Package: "+meta["name"],"Version: "+meta["version"],"Architecture: "+meta["architecture"],
 "Maintainer: Patrick <Pew2018@users.noreply.github.com>","Section: luci","Priority: optional",
 "Depends: "+meta["dependencies"],"Installed-Size: "+str(size),
 "Description: "+meta["description"]+"\n Classic local theme; Lua LuCI 21.02 compatible.",""
]).encode()
controls=[("control",control,0o644)]+[(p.name,p.read_bytes(),0o755) for p in (ROOT/"theme/control").iterdir()]
data=archive(items);ctrl=archive(controls)
out=ROOT/"dist";out.mkdir(exist_ok=True)
name=meta["name"]+"_"+meta["version"]+"_"+meta["architecture"]+".ipk"
ipk=archive([("debian-binary",b"2.0\n",0o644),("data.tar.gz",data,0o644),("control.tar.gz",ctrl,0o644)])
(out/name).write_bytes(ipk)
# Independently inspect the resulting archive, path allowlist and metadata.
outer=tarfile.open(fileobj=io.BytesIO(ipk))
assert sorted(n.removeprefix("./") for n in outer.getnames())==["control.tar.gz","data.tar.gz","debian-binary"]
c=tarfile.open(fileobj=io.BytesIO(outer.extractfile("./control.tar.gz").read()))
assert b"Architecture: aarch64_cortex-a53\n" in c.extractfile("./control").read()
d=tarfile.open(fileobj=io.BytesIO(outer.extractfile("./data.tar.gz").read()))
allowed=("www/luci-static/materialluci/","www/luci-static/resources/materialluci-menu.js","usr/lib/lua/luci/view/themes/materialluci/","etc/uci-defaults/95-materialluci","usr/share/doc/luci-theme-materialluci/")
for member in d:
 n=member.name.removeprefix("./")
 assert member.isfile() and ".." not in pathlib.PurePosixPath(n).parts and n.startswith(allowed), n
(out/"SHA256SUMS").write_text(hashlib.sha256(ipk).hexdigest()+"  "+name+"\n")
(out/"package-manifest.json").write_text(json.dumps({"package":meta,"uncompressedBytes":size,"ipkBytes":len(ipk),"files":[n for n,_,_ in items]},indent=2))
shutil.copy(ROOT/"docs/INSTALL.md",out/"INSTALL.md")
print(json.dumps({"file":name,"bytes":len(ipk),"files":len(items)}))
