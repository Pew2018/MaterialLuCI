#!/usr/bin/env python3
"""CI-only x86_64 packaging adapter; preserve the selected branch's UI."""
import argparse, hashlib, io, json, os, pathlib, subprocess, tarfile
p=argparse.ArgumentParser()
p.add_argument("--source",required=True)
p.add_argument("--branch",required=True)
a=p.parse_args()
root=pathlib.Path(a.source).resolve()
script=root/"scripts/build.py"
meta_path=root/"theme/package.json"
original_meta=meta_path.read_text()
meta=json.loads(original_meta)
assert meta["architecture"]=="aarch64_cortex-a53" and meta["target"]=="mediatek/mt7981"
sha=subprocess.check_output(["git","rev-parse","HEAD"],cwd=root,text=True).strip()
os.environ["GITHUB_SHA"]=sha
os.environ["SOURCE_DATE_EPOCH"]=subprocess.check_output(["git","log","-1","--format=%ct"],cwd=root,text=True).strip()
original_script=script.read_text()
def build(code):
 exec(compile(code,str(script),"exec"),{"__file__":str(script),"__name__":"__main__"})
def unpack(raw):
 outer=tarfile.open(fileobj=io.BytesIO(raw))
 assert sorted(n.removeprefix("./") for n in outer.getnames())==["control.tar.gz","data.tar.gz","debian-binary"]
 def entries(name):
  inner=tarfile.open(fileobj=io.BytesIO(outer.extractfile("./"+name).read()))
  return {m.name:(m.mode,m.type,inner.extractfile(m).read() if m.isfile() else b"") for m in inner}
 return entries("data.tar.gz"),entries("control.tar.gz")
build(original_script)
native=list((root/"dist").glob("*.ipk"))
assert len(native)==1
native_bytes=native[0].read_bytes()
native_payload,native_control=unpack(native_bytes)
native_archive=root/"build/reference-arm.ipk"
native_archive.write_bytes(native_bytes)
# Adapt only the two explicit build architecture assertions, in memory.
old='assert meta["architecture"]=="aarch64_cortex-a53" and meta["target"]=="mediatek/mt7981"'
new='assert meta["architecture"]=="x86_64" and meta["target"]=="x86/64"'
old_control='assert b"Architecture: aarch64_cortex-a53\\n" in c.extractfile("./control").read()'
new_control='assert b"Architecture: x86_64\\n" in c.extractfile("./control").read()'
assert original_script.count(old)==1 and original_script.count(old_control)==1
code=original_script.replace(old,new).replace(old_control,new_control)
meta.update(architecture="x86_64",target="x86/64")
try:
 meta_path.write_text(json.dumps(meta,indent=2)+"\n")
 build(code)
finally:
 meta_path.write_text(original_meta)
ipks=list((root/"dist").glob("*.ipk"))
assert len(ipks)==1 and ipks[0].name.endswith("_x86_64.ipk")
vm_bytes=ipks[0].read_bytes()
vm_payload,vm_control=unpack(vm_bytes)
assert vm_payload==native_payload,"VM theme payload differs from its branch's ARM build"
control_key="./control"
assert set(native_control)==set(vm_control)
for name in native_control:
 if name!=control_key:assert native_control[name]==vm_control[name],name
native_text=native_control[control_key][2]
vm_text=vm_control[control_key][2]
assert vm_text==native_text.replace(b"Architecture: aarch64_cortex-a53\n",b"Architecture: x86_64\n")
assert not any(item[2].startswith(b"\x7fELF") for item in vm_payload.values()),"Resource package contains native ELF code"
identity={"branch":a.branch,"source_sha":sha,"actions_run_id":os.environ["GITHUB_RUN_ID"],
 "architecture":"x86_64","target":"x86/64","ipk":ipks[0].name,
 "ipk_sha256":hashlib.sha256(vm_bytes).hexdigest(),
 "reference_arm_sha256":hashlib.sha256(native_bytes).hexdigest(),
 "payload_byte_identical":True,"control_scripts_identical":True,
 "original_build_script_unchanged":script.read_text()==original_script,
 "original_package_metadata_restored":meta_path.read_text()==original_meta}
(root/"build/vm-target-audit.json").write_text(json.dumps(identity,indent=2)+"\n")
print(json.dumps(identity,indent=2))
assert subprocess.check_output(["git","diff","--","theme","scripts"],cwd=root,text=True)==""
