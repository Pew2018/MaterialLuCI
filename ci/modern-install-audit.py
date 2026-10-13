#!/usr/bin/env python3
"""Offline APK transaction test; native LuCI dependency is a test-only stub."""
import hashlib,json,os,pathlib,subprocess
r=pathlib.Path(__file__).resolve().parents[1]
apk=(r/'build/apk-tool').read_text();pkg=next((r/'dist/modern').glob('*.apk'))
area=r/'build/apk-transaction';area.mkdir(parents=True,exist_ok=True)
empty=area/'empty';empty.mkdir()
old=area/'old';(old/'www/luci-static/materialluci').mkdir(parents=True)
(old/'www/luci-static/materialluci/obsolete-test-marker').write_text('obsolete')
def make(name,version,files):
 out=area/(name+'-'+version+'.apk')
 subprocess.run([apk,'mkpkg','--info','name:'+name,'--info','version:'+version,'--info','arch:noarch','--info','license:Apache-2.0','--files',str(files),'--output',str(out)],check=True)
 return out
dep=make('luci-base','999.0-r1',empty)
libc=make('libc','999.0-r1',empty)
previous=make('luci-theme-materialluci','1.0.0-r1',old)
inst=area/'root'
def transaction(*args):
 subprocess.run([apk,'--usermode','--root',str(inst),'--allow-untrusted','--no-network','--no-scripts',*args],check=True)
transaction('--initdb','add',str(dep),str(libc),str(previous))
sentinel=inst/'www/luci-static/resources/core-test-sentinel.js'
sentinel.parent.mkdir(parents=True,exist_ok=True);sentinel.write_text('preserve core')
transaction('add',str(pkg))
assert not (inst/'www/luci-static/materialluci/obsolete-test-marker').exists()
manifest=json.loads((r/'build/apk-root/www/luci-static/materialluci/build.json').read_text())
for n,digest in manifest['files'].items():assert hashlib.sha256((inst/n).read_bytes()).hexdigest()==digest,n
assert sentinel.read_text()=='preserve core'
transaction('del','luci-theme-materialluci')
assert not (inst/'usr/share/ucode/luci/template/themes/materialluci/header.ut').exists()
assert sentinel.read_text()=='preserve core'
scripts=json.loads((r/'dist/modern/apk-metadata.json').read_text())['scripts']
for name,script in scripts.items():
 if not isinstance(script,str):continue
 subprocess.run(['sh','-n'],input=script,text=True,check=True)
assert 'PKG_UPGRADE=1' in scripts['post-upgrade']
assert 'luci.themes.MaterialLuCI' in scripts['post-install']
assert 'PKG_UPGRADE' in scripts['pre-deinstall'] and 'Select another installed theme' in scripts['pre-deinstall']
(r/'dist/modern/install-checks.json').write_text(json.dumps({'checks':['offline APK3 install','upgrade from 1.0.0-r1 removes obsolete file','installed payload hashes','uninstall removes theme and preserves shared sentinel','actual lifecycle scripts shell syntax and upgrade markers'],'limitations':['no script execution in sandbox transactions','test-only luci-base dependency stub','router UCI and default_postinst/default_prerm need real firmware retest']},indent=2)+'\n')
print('Offline install/upgrade/uninstall and script syntax passed; router lifecycle pending.')
