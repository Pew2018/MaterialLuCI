#!/usr/bin/env python3
"""Download checksum-pinned SDK and install the release's pinned LuCI feed."""
import hashlib,json,pathlib,subprocess,urllib.request,shutil
root=pathlib.Path(__file__).resolve().parents[1]
t=json.loads((root/'ci/modern-target.json').read_text())
build=root/'build';build.mkdir(exist_ok=True)
for kind in ('sdk','feeds'):
 path=build/(kind+'.download')
 urllib.request.urlretrieve(t[kind+'_url'],path)
 assert hashlib.sha256(path.read_bytes()).hexdigest()==t[kind+'_sha256'],kind+' checksum mismatch'
feeds=(build/'feeds.download').read_text()
assert t['luci'] in feeds,'SDK feed provenance does not match fixed LuCI'
subprocess.run(['tar','--zstd','-xf',str(build/'sdk.download'),'-C',str(build)],check=True)
dirs=list(build.glob('openwrt-sdk-*'));assert len(dirs)==1
sdk=dirs[0];(build/'sdk-path').write_text(str(sdk))
assert t['luci'] in (sdk/'feeds.conf.default').read_text()
subprocess.run(['./scripts/feeds','update','luci'],cwd=sdk,check=True)
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=sdk/'feeds/luci',text=True).strip()
assert head==t['luci'],head
subprocess.run(['./scripts/feeds','install','-p','luci','luci-base'],cwd=sdk,check=True)
shutil.copytree(build/'modern-package',sdk/'package/luci-theme-materialluci')
with (sdk/'.config').open('a') as f:
 f.write('\nCONFIG_PACKAGE_luci-theme-materialluci=m\nCONFIG_LUCI_JSMIN=n\nCONFIG_LUCI_CSSTIDY=n\n')
subprocess.run(['make','defconfig'],cwd=sdk,check=True)
assert 'CONFIG_USE_APK=y' in (sdk/'.config').read_text()
subprocess.run(['make','package/luci-theme-materialluci/compile','-j2','V=s'],cwd=sdk,check=True)
packages=list((sdk/'bin/packages').rglob('luci-theme-materialluci-*.apk'));assert len(packages)==1,packages
dest=root/'dist/modern';dest.mkdir(parents=True,exist_ok=True)
shutil.copy(packages[0],dest/packages[0].name)
apk=sdk/'staging_dir/host/bin/apk';assert apk.exists()
(build/'apk-tool').write_text(str(apk))
