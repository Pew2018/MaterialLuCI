#!/usr/bin/env python3
"""Use SDK apk to extract and audit the actual APK3 payload and metadata."""
import hashlib,json,os,pathlib,re,subprocess
root=pathlib.Path(__file__).resolve().parents[1]
apk=(root/'build/apk-tool').read_text()
packages=list((root/'dist/modern').glob('*.apk'));assert len(packages)==1
package=packages[0]
out=root/'build/apk-root';out.mkdir(parents=True,exist_ok=True)
subprocess.run([apk,'extract','--allow-untrusted','--destination',str(out),str(package)],check=True)
metadata=subprocess.check_output([apk,'adbdump','--format','json',str(package)],text=True)
(root/'dist/modern/apk-metadata.json').write_text(metadata)
data=json.loads(metadata)
info=data['info']
meta=json.loads((root/'theme/package.json').read_text())
assert info['name']==meta['name'] and info['version']==meta['version']+'-r1',info
assert info['arch']=='noarch' and info['license']=='Apache-2.0',info
assert 'luci-base' in info['depends'] and not any('lua' in d for d in info['depends']),info
files={str(p.relative_to(out)):p for p in out.rglob('*') if p.is_file()}
assert not any(n.startswith('usr/lib/lua/') for n in files)
assets='www/luci-static/materialluci/'
identity=json.loads(files[assets+'build.json'].read_text())
assert identity['commit']==os.environ['GITHUB_SHA'] and str(identity['run_id'])==os.environ['GITHUB_RUN_ID']
actual={n for n,p in files.items() if p.suffix in ('.js','.css','.svg','.ut')}
assert set(identity['files'])==actual
for n,digest in identity['files'].items():assert hashlib.sha256(files[n].read_bytes()).hexdigest()==digest,n
allowed=('www/luci-static/materialluci/','www/luci-static/resources/materialluci-menu','usr/share/ucode/luci/template/themes/materialluci/','usr/share/doc/luci-theme-materialluci/','lib/apk/packages/luci-theme-materialluci')
for n,p in files.items():
 assert any(n.startswith(prefix) for prefix in allowed),n
 assert not p.read_bytes().startswith((b'\x7fELF',b'MZ')),n
templates=[n for n in files if n.endswith('.ut')]
assert len(templates)==3,templates
for n in templates:
 text=files[n].read_text()
 assert not re.search(r'@(CACHE|COMMIT|MENU_CLASS|VERSION)@',text),n
 for asset in re.findall(r'{{ media }}/([^"?]+)\?v=',text):assert assets+asset in files,asset
assert files['usr/share/doc/luci-theme-materialluci/LICENSE'].stat().st_size>1000
scripts=data['scripts']
assert all(k in scripts for k in ('post-install','post-upgrade','pre-deinstall'))
manifest={'commit':identity['commit'],'run_id':identity['run_id'],'version':info['version'],'architecture':info['arch'],'depends':info['depends'],'license':info['license'],'apk':package.name,'apk_sha256':hashlib.sha256(package.read_bytes()).hexdigest(),'cache':identity['cache'],'target':identity['target'],'checks':['SDK APK3 metadata','exact payload allowlist','no machine code or Lua runtime dependency','all resource hashes','three ucode entries','local assets and licenses','install upgrade and removal scripts']}
(root/'dist/modern/build-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
