#!/usr/bin/env python3
"""Read the actual IPK payload; never infer its identity from a working tree."""
import argparse, hashlib, io, json, pathlib, tarfile, zipfile, re
p=argparse.ArgumentParser()
p.add_argument("input");p.add_argument("--sha",required=True);p.add_argument("--run",required=True)
p.add_argument("--candidate",action="store_true");p.add_argument("--out",required=True);p.add_argument("--extract")
a=p.parse_args();source=pathlib.Path(a.input)
if source.suffix==".zip":
 z=zipfile.ZipFile(source);names=[n for n in z.namelist() if n.endswith(".ipk")]
 assert len(names)==1,names
 name=pathlib.PurePosixPath(names[0]).name;raw=z.read(names[0])
else:name=source.name;raw=source.read_bytes()
outer=tarfile.open(fileobj=io.BytesIO(raw))
data=tarfile.open(fileobj=io.BytesIO(outer.extractfile("./data.tar.gz").read()))
files={}
for member in data:
 if not member.isfile():continue
 path=member.name.removeprefix("./");assert ".." not in pathlib.PurePosixPath(path).parts
 files[path]=data.extractfile(member).read()
assets="www/luci-static/materialluci/"
header=files["usr/lib/lua/luci/view/themes/materialluci/header.htm"].decode()
required=["cascade.css","palette.js","startup.js","app.js","feedback.js","wait.js",
 "mdc-linear-progress.js","mdc-linear-progress.css","mdc-switch.js","icons/pause.svg","icons/play.svg"]
assert all(assets+n in files for n in required)
assert "@CACHE@" not in header and "@MENU_CLASS@" not in header
assert 'mdc-switch.js?v=' in header and 'wait.js?v=' in header
menus=[n for n in files if n.startswith("www/luci-static/resources/materialluci-menu")];assert len(menus)==1
checks={
 "neutral_browser_hints":'#FAFAFA' in header and ('#121212' in header or '#121212' in files[assets+"startup.js"].decode()),
 "appearance_present":"ml-appearance-entry" in files[assets+"app.js"].decode(),
 "view_observer_present":"view" in files[assets+"wait.js"].decode(),
 "official_switch_bundle":"mdc-switch" in files[assets+"mdc-switch.js"].decode(),
 "about_absent":'"关于"' not in files[assets+"app.js"].decode() and '"About"' not in files[assets+"app.js"].decode(),
}
if a.candidate:
 identity=json.loads(files[assets+"build.json"])
 assert identity["commit"]==a.sha and str(identity["run_id"])==a.run
 assert identity["cache"] in header and a.sha in header
 for n,digest in identity["files"].items():assert hashlib.sha256(files[n]).hexdigest()==digest,n
 assert header.count('name="theme-color"')==1
 assert 'black-translucent' not in header and 'viewport-fit=cover' not in header
 app=files[assets+"app.js"].decode();wait=files[assets+"wait.js"].decode();css=files[assets+"cascade.css"].decode()
 assert 'ml-nav-parent-label' in app and 'aria-expanded' in app
 assert '"关于"' not in app and '"About"' not in app
 assert 'ml-view-progress' in wait and 'MDCLinearProgress' in wait
 assert 'ml-chart-surface' in css and 'body[data-page$="-load"]' not in css
 assert '<svg' in files[assets+"icons/pause.svg"].decode()
 checks["commit_and_all_resource_hashes_verified"]=True
manifest={"source_sha":a.sha,"actions_run_id":a.run,"ipk":name,
 "ipk_sha256":hashlib.sha256(raw).hexdigest(),"checks":checks,
 "resource_cache":re.search(r"\\?v=([^\\\"\\s<>]+)",header).group(1),
 "header_sha256":hashlib.sha256(header.encode()).hexdigest(),
 "files":{n:{"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()} for n,b in sorted(files.items())},
 "header":header}
out=pathlib.Path(a.out);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(manifest,indent=2))
if a.extract:
 root=pathlib.Path(a.extract);root.mkdir(parents=True,exist_ok=True)
 for n,b in files.items():
  target=root/n;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(b)
print(json.dumps({k:v for k,v in manifest.items() if k not in ("files","header")},indent=2))
