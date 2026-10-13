#!/usr/bin/env python3
"""Stage a ucode-only SDK package from the already built shared resources."""
import hashlib, json, os, pathlib, shutil
root=pathlib.Path(__file__).resolve().parents[1]
meta=json.loads((root/'theme/package.json').read_text())
assert json.loads((root/'package.json').read_text())['version']==meta['version']
target=json.loads((root/'ci/modern-target.json').read_text())
stage=root/'build/stage'
identity=json.loads((stage/'www/luci-static/materialluci/build.json').read_text())
assert identity['commit']==os.environ['GITHUB_SHA']
pkg=root/'build/modern-package'
if pkg.exists():shutil.rmtree(pkg)
pkg.mkdir(parents=True)
shutil.copy(root/'theme/Makefile',pkg/'Makefile')
(pkg/'version.mk').write_text('PKG_VERSION:='+meta['version']+'\n')
for directory in ('www','usr/share/doc'):
 src=stage/directory;dst=pkg/'root'/directory
 dst.parent.mkdir(parents=True,exist_ok=True);shutil.copytree(src,dst)
shutil.copytree(root/'theme/ucode',pkg/'ucode')
menu=[p.stem for p in (pkg/'root/www/luci-static/resources').glob('materialluci-menu*.js')]
assert len(menu)==1
for p in (pkg/'ucode').rglob('*.ut'):
 p.write_text(p.read_text().replace('@COMMIT@',identity['commit']).replace('@CACHE@',identity['cache']).replace('@VERSION@',meta['version']).replace('@MENU_CLASS@',menu[0]))
payload={str(p.relative_to(pkg/'root')):p for p in (pkg/'root').rglob('*') if p.is_file()}
payload.update({'usr/share/ucode/luci/'+str(p.relative_to(pkg/'ucode')):p for p in (pkg/'ucode').rglob('*') if p.is_file()})
for name,p in payload.items():
 b=p.read_bytes()
 assert not b.startswith((b'\x7fELF',b'MZ',b'\xcf\xfa\xed\xfe',b'\xfe\xed\xfa\xcf')),name
 assert p.suffix not in ('.so','.ko','.a','.o','.wasm','.ucb'),name
 assert not name.startswith('usr/lib/lua/'),name
identity.update(format='apk',architecture='noarch',target=target)
identity['files']={n:hashlib.sha256(p.read_bytes()).hexdigest() for n,p in sorted(payload.items()) if p.suffix in ('.js','.css','.svg','.ut')}
(pkg/'root/www/luci-static/materialluci/build.json').write_text(json.dumps(identity,sort_keys=True)+'\n')
print(json.dumps({'version':meta['version'],'files':len(payload),'architecture':'noarch','luci':target['luci']}))
