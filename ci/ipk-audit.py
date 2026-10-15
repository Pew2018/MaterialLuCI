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
meta=json.loads(pathlib.Path("theme/package.json").read_text())
assert json.loads(pathlib.Path("package.json").read_text())["version"]==meta["version"]
assert name==f'{meta["name"]}_{meta["version"]}_{meta["architecture"]}.ipk'
outer=tarfile.open(fileobj=io.BytesIO(raw))
ctrl=tarfile.open(fileobj=io.BytesIO(outer.extractfile("./control.tar.gz").read()))
control=ctrl.extractfile("./control").read().decode()
for key,field in (("name","Package"),("version","Version"),("architecture","Architecture"),("dependencies","Depends")):
 assert f'{field}: {meta[key]}\n' in control,(field,meta[key])
data=tarfile.open(fileobj=io.BytesIO(outer.extractfile("./data.tar.gz").read()))
files={}
for member in data:
 if not member.isfile():continue
 path=member.name.removeprefix("./");assert ".." not in pathlib.PurePosixPath(path).parts
 files[path]=data.extractfile(member).read()
assets="www/luci-static/materialluci/"
header=files["usr/lib/lua/luci/view/themes/materialluci/header.htm"].decode()
required=["cascade.css","palette.js","startup.js","app.js","feedback.js","wait.js",
 "runtime.js","surfaces.js","mdc-linear-progress.js","mdc-linear-progress.css","mdc-switch.js","icons/pause.svg","icons/play.svg"]
assert all(assets+n in files for n in required)
if "palette-m3.js?v=" in header:
 assert all(assets+n in files for n in ("palette-m3.js","material-web.js","components.js","design-m3.css"))
 assert all(name+"?v=" in header for name in ("palette-m3.js","material-web.js","components.js","design-m3.css"))
assert "@CACHE@" not in header and "@MENU_CLASS@" not in header
assert 'mdc-switch.js?v=' in header and 'wait.js?v=' in header
menus=[n for n in files if n.startswith("www/luci-static/resources/materialluci-menu")];assert len(menus)==1
assert any(n.startswith("usr/share/doc/luci-theme-materialluci/") and "LICENSE" in n for n in files)
# Every local resource referenced by a packaged template must exist.
for template_path, payload in files.items():
 if not template_path.endswith(".htm"):continue
 for resource in re.findall(r'<%=media%>/([^"<>?]+)[?]v=',payload.decode()):assert assets+resource in files,resource
checks={
 "package_metadata_matches_payload":True,
 "neutral_browser_hints":'#FAFAFA' in header and ('#121212' in header or '#121212' in files[assets+"startup.js"].decode()),
 "appearance_present":"ml-appearance-entry" in files[assets+"app.js"].decode(),
 "view_observer_present":"view" in files[assets+"wait.js"].decode(),
 "official_switch_bundle":"mdc-switch" in files[assets+"mdc-switch.js"].decode(),
 "about_absent":'"关于"' not in files[assets+"app.js"].decode() and '"About"' not in files[assets+"app.js"].decode(),
}
if a.candidate:
 assert all(assets+n in files for n in ["mdc-textfield.js","textfield.js","icons/expand-more.svg"])
 assert "mdc-textfield.js?v=" in header and "textfield.js?v=" in header
 assert "MDCTextField" in files[assets+"mdc-textfield.js"].decode()
 assert all(assets+n in files for n in ["mdc-controls.js","controls.js"])
 assert "mdc-controls.js?v=" in header and "controls.js?v=" in header
 controls=files[assets+"mdc-controls.js"].decode()
 for component in ["MDCRipple","MDCDialog","MDCCheckbox","MDCRadio","MDCFormField","MDCMenu","MDCList","MDCMenuSurface","MDCSelect","MDCSnackbar","MDCTooltip"]:assert component in controls,component
 shared_css=files[assets+"mdc-linear-progress.css"].decode()
 for cls in ["mdc-button","mdc-icon-button","mdc-dialog","mdc-checkbox","mdc-radio","mdc-menu","mdc-menu-surface","mdc-select","mdc-snackbar","mdc-tooltip"]:assert cls in shared_css,cls
 assert assets+"extras.js" in files and "extras.js?v=" in header
 checks["official_extra_controls_bundled"]=True
 checks["official_controls_bundled"]=True
 assert "mdc-text-field" in files[assets+"mdc-linear-progress.css"].decode()
 checks["official_textfield_bundle"]=True
 identity=json.loads(files[assets+"build.json"])
 assert identity["commit"]==a.sha and str(identity["run_id"])==a.run
 assert identity["cache"] in header and a.sha in header
 assert set(identity["files"])=={n for n in files if pathlib.PurePosixPath(n).suffix in (".js",".css",".svg",".htm")}
 for n,digest in identity["files"].items():assert hashlib.sha256(files[n]).hexdigest()==digest,n
 assert header.count('name="theme-color"')==1
 assert 'black-translucent' not in header and 'viewport-fit=cover' not in header
 app=files[assets+"app.js"].decode();wait=files[assets+"wait.js"].decode();css=files[assets+"cascade.css"].decode()
 assert 'ml-nav-parent-label' in app and 'aria-expanded' in app
 assert '"关于"' not in app and '"About"' not in app
 assert 'ml-view-progress' in wait
 assert 'surfaces.js?v=' in header and 'MaterialSurfaces' in files[assets+"surfaces.js"].decode()
 assert 'MaterialSurfaces.prepare' in app and 'MaterialSurfaces' in wait
 checks["critical_layout_preparation_packaged"]=True
 if assets+"components.js" in files:
  adapter=files[assets+"components.js"].decode()
  assert 'MaterialComponents.progress' in wait and 'MDCLinearProgress' in adapter and 'ml-wavy-progress' in adapter
  assert "ml-wave-travel" in files[assets+"design-m3.css"].decode()
  assert "md-ripple" in files[assets+"material-web.js"].decode()
  assert 'scene:"view"' in wait and 'scene:"modal"' in wait
  assert re.search(r'\.scene\s*!==?\s*["\x27]view["\x27]',adapter), "view must bypass wavy engine"
  assert re.search(r'\.scene\s*!==?\s*["\x27]modal["\x27]',adapter), "modal must bypass wavy engine"
  checks["view_and_modal_official_mdc_scene_contract_packaged"]=True
  checks["dual_style_progress_adapter_packaged"]=True
  assert "mdc-linear-progress-primary-indeterminate-translate" in shared_css
  assert "height:4px" in files[assets+"design-m3.css"].decode() and "height:16px" in files[assets+"design-m3.css"].decode()
  checks["official_animation_and_progress_hosts_packaged"]=True
  checks["expressive_wave_and_official_ripple_packaged"]=True
 else:assert 'MDCLinearProgress' in wait
 assert '<svg' in files[assets+"icons/pause.svg"].decode()
 checks["commit_and_all_resource_hashes_verified"]=True
manifest={"source_sha":a.sha,"actions_run_id":a.run,"ipk":name,
 "ipk_sha256":hashlib.sha256(raw).hexdigest(),"checks":checks,
 "resource_cache":re.search(r'[?]v=([^"]+)',header).group(1),
 "header_sha256":hashlib.sha256(header.encode()).hexdigest(),
 "files":{n:{"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()} for n,b in sorted(files.items())},
 "header":header}
out=pathlib.Path(a.out);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(manifest,indent=2))
if a.extract:
 root=pathlib.Path(a.extract);root.mkdir(parents=True,exist_ok=True)
 for n,b in files.items():
  target=root/n;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(b)
print(json.dumps({k:v for k,v in manifest.items() if k not in ("files","header")},indent=2))
