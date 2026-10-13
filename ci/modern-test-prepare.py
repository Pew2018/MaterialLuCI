#!/usr/bin/env python3
"""Use pinned upstream resources and rendered ucode, not legacy HTML fixtures."""
import json,pathlib,shutil,subprocess,os
root=pathlib.Path(__file__).resolve().parents[1]
target=json.loads((root/'ci/modern-target.json').read_text())
sdk=pathlib.Path((root/'build/sdk-path').read_text())
subprocess.run(['make','package/ucode/host/compile','-j2','V=s'],cwd=sdk,check=True)
ucode=sdk/'staging_dir/hostpkg/bin/ucode';assert ucode.exists()
up=sdk/'feeds/luci/modules/luci-base'
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=sdk/'feeds/luci',text=True).strip()==target['luci']
web=root/'build/modern-web';web.mkdir(parents=True,exist_ok=True)
shutil.copytree(root/'build/apk-root/www',web,dirs_exist_ok=True)
shutil.copytree(up/'htdocs',web,dirs_exist_ok=True)
templates=root/'build/modern-templates';templates.mkdir(exist_ok=True)
shutil.copytree(up/'ucode/template',templates/'core',dirs_exist_ok=True)
shutil.copytree(root/'build/apk-root/usr/share/ucode/luci/template',templates/'theme',dirs_exist_ok=True)
subprocess.run([str(ucode),'-L',str(root/'ci/modern-mocks/*.uc'),str(root/'ci/modern-render.uc'),str(templates),str(web)],check=True)
normal=(web/'modern.html').read_text();blank=(web/'blank.html').read_text();login=(web/'login.html').read_text();restricted=(web/'restricted.html').read_text()
assert normal.count('<main ')==normal.count('</main>')==1
assert normal.count('<body ')==normal.count('</body>')==1
assert 'data-page="admin-system-general"' in normal and 'No password set!' in normal and 'recovery (initramfs)' in normal
assert 'data-default-name="router&quot;&gt;&lt;script&gt;' in normal
assert '<script>alert(1)</script>' not in normal
assert 'new LuCI(' in normal and 'pollinterval' in normal
assert 'id="ml-sidebar"' not in blank and 'id="maincontent"' not in blank and 'app.js?v=' not in blank
assert 'id="blank-marker"' in blank and '</html>' in blank
assert 'luci_username' in login and 'luci_password' in login and 'Invalid username' in login
assert 'No password set!' not in restricted and 'recovery (initramfs)' not in restricted
assert 'Go to password configuration' not in restricted
resources=web/'luci-static/resources/view';resources.mkdir(exist_ok=True)
shutil.copy(root/'ci/modern-contract-view.js',resources/'modern-contract.js')
(root/'dist/modern/template-checks.json').write_text(json.dumps({'engine':target['ucode'],'luci':target['luci'],'cases':['normal','blank','login-error','restricted'],'escape':'hostname and route attributes','core_initialization':'official header and footer','lua_compatibility':'not required'},indent=2)+'\n')
print('Actual ucode templates rendered and checked against fixed core header/footer.')
