# Modern LuCI compatibility — 1.0.1 development

## Fixed target and provenance

- OpenWrt **25.12.5**, firmware source tag `v25.12.5`.
- Matching LuCI: `128a7812f4be233c5dd7f7466f534fd888785caf`, from the firmware tag's `feeds.conf.default`; SDK `feeds.buildinfo` and checked-out feed must agree.
- Matching ucode: `85922056ef7abeace3cca3ab28bc1ac2d88e31b1`, from the release's ucode package Makefile.
- SDK: official x86/64, GCC 14.3.0 musl, SHA256 `0c8df0151a1e88feb7c03d694d61f6a18d51872815b7c811d76e2b77504d5e9c`.
- SDK/feed URLs and checksums are recorded in [ci/modern-target.json](../ci/modern-target.json). Both downloads are verified before use. No floating upstream master is used.
- APK here means OpenWrt's Alpine Package Keeper format, not an Android app.

Sources: [release announcement](https://lists.openwrt.org/pipermail/openwrt-announce/2026-June/000088.html), [official SDK directory](https://downloads.openwrt.org/releases/25.12.5/targets/x86/64/), [release feed pins](https://github.com/openwrt/openwrt/blob/v25.12.5/feeds.conf.default), [fixed Bootstrap](https://github.com/openwrt/luci/tree/128a7812f4be233c5dd7f7466f534fd888785caf/themes/luci-theme-bootstrap), [luci.mk](https://github.com/openwrt/luci/blob/128a7812f4be233c5dd7f7466f534fd888785caf/luci.mk).

## Branch baseline

| Branch | Verified baseline | Version |
| --- | --- | --- |
| main (untouched) | 784d512b4a56156017075379f8c193296c866dec | 1.0.0 |
| feature/m3e-theme before bump | 8a77cf948e202ed521c602e060141272714c96b6 | 0.3.0-16 |
| feature/m3e-theme after bump | b23289086d27e0c066a588b990202af582ed10e6 | 1.0.1 |
| feature/modern-luci created from | b23289086d27e0c066a588b990202af582ed10e6 | 1.0.1 |

The initial main/feature runtime trees were identical; main added release documentation and version metadata. [Feature version build](https://github.com/Pew2018/MaterialLuCI/actions/runs/38342478237) passed before modern branch creation. Only the modern branch changes after this point. No release or tag is created.

## Entrypoints and package selection

| Package | Templates | Runtime dependencies | Scope |
| --- | --- | --- | --- |
| Legacy IPK | `/usr/lib/lua/luci/view/themes/materialluci/*.htm` | existing Lua LuCI + luci-base | Existing AX3000T / aarch64_cortex-a53 Lua LuCI target; original architecture restriction retained |
| Modern SDK APK | `/usr/share/ucode/luci/template/themes/materialluci/*.ut` | luci-base and its native ucode dependencies | Fixed OpenWrt 25.12.5 / fixed LuCI above; architecture eligibility noarch, hardware behavior pending |

Both use the same package name and media URL. They are **alternative installations for different firmware/package managers**, not packages to install together. The modern package intentionally excludes Lua templates, avoiding a fallback that silently requires luci-lua-runtime. The repository retains all Lua templates; `theme/ucode` is outside the legacy `theme/root` payload. The duplicate top-level `root` is preserved and is not a packaging source.

Shared CSS, JS, SVG and official component bundles originate from `theme/root`, are built once, then staged into the SDK package. `theme/Makefile` includes the fixed feed's `luci.mk`; SDK staging generates `version.mk` from `theme/package.json`. Both package metadata files must agree. OpenWrt adds its normal `-r1` package release suffix to the APK version.

Templates remain UTF-8 ucode source. The fixed `luci.mk` copies `.ut` source; the runtime compiles it using `loadfile(..., {raw_mode:false})`. Host bytecode is never shipped, so CPU-specific or host runtime bytecode is not introduced. CI uses the release's matching ucode host compiler to render them.

The resource payload is checked for executable magic and native object extensions before declaring `LUCI_PKGARCH=all`. The SDK maps that to APK `arch=noarch`, and the actual package is re-extracted to verify it. This establishes architecture-independent package eligibility, not tests on every architecture or router.

## Actual upstream differences and implementation

| Contract | Lua entry | Fixed ucode entry / decision |
| --- | --- | --- |
| Language and route | luci.i18n.context.lang, dispatcher.context | dispatcher.lang, ctx.request_path; escaped data-page |
| Device info | luci.util.ubus | ubus.call('system','board') |
| Root password | luci.sys process/user helpers | luci.core getuid/getspnam |
| URL and translation | url(), translate() | dispatcher.build_url(), _() |
| Page context | Lua globals/context | dispatched, node, version, blank_page |
| Engine path | Lua view directory | native /usr/share/ucode/luci/template |
| Initialization | core Lua header/footer | core ucode header creates L.env, core footer handles apply/revert/rollback; theme never duplicates these |
| Menu startup | DOMContentLoaded | once on luci-loaded or already-loaded L; skipped on login and blank page |
| Recovery warning | absent in old shell | fixed Bootstrap's initramfs notice and permission-aware upgrade link |
| Cache | theme cache and unique module name | shared commit/version cache; native core resource version remains owned by LuCI |

The theme retains its shell and scrolling model. Its header opens exactly the containers its footer closes when `blank_page` is false, and neither opens shell containers on a blank page. User/device strings are escaped for HTML text and attributes. The login template uses the fixed core contract, autocomplete and label associations; an upstream singular-variable typo in HTTPS string-port handling is corrected only in the theme template.

The native core header/footer are not replaced. Their apply/rollback, token, resource URL and routing values remain authoritative. No shared core file is installed by this package.

## Frontend compatibility

Reviewed fixed `luci.js` (which contains view/dom/poll), `ui.js` (including menu and changes), `form.js`, Bootstrap menu, dispatcher and runtime. Menu getChildren() still owns ACL/dependency filtering, order, alias/rewrite and names. The shared theme calls it and builds URLs through L.url. The native route tabs remain in tabmenu.

The target still uses cbi-checkbox, cbi-dropdown, cbi-dynlist, native fields and form.SectionValue, #view direct .spinning loader, #modal_overlay > .modal and modal-overlay-active. These match existing adapters; no shared runtime adapter change is necessary for the pinned target. Business polling, RPC, native field values, validation, navigation, DOM.content and View functions are not patched.

The shared source files are left byte-for-byte unchanged from the tested feature baseline. Existing performance contracts continue to cover branding invalidation, indicator isolation, deduplicated writes and subtree discovery, synchronous surface preparation, table/chart update isolation, viewport writes with retained focus, moves/removals and lifecycle cleanup. The LED abbreviation fix remains in shared CSS.

## Validation and limits

The default modern branch build runs:
1. Existing script/Lua template syntax, performance contracts and actual legacy IPK audit.
2. Verified release SDK + feed, SDK APK build, official apk extraction and metadata inspection.
3. Exact actual APK file allowlist, dependency/license/architecture checks, source SHA, run ID, cache and every shipped resource digest.
4. Matching ucode engine rendering with fixed official core header/footer and actual packaged templates: normal, login failure, blank, restricted menu/password context, no-password and initramfs warnings, hostname escaping and balanced shell.
5. A small Chromium contract run using fixed real LuCI frontend and actual form/view/ui widgets. OS/ubus/HTTP responses are mocked and config writes are rejected. It covers drawer/menu ACL, route tabs, load completion, validation, one Flag event, DynamicList/ListValue, native reset, fieldset state restoration, nested SectionValue, modal wait feedback, both styles and modes, moved/disconnected nodes, desktop overflow and a persisted pageshow event. One representative screenshot, no large matrix.

A simulated persisted pageshow is not proof of browser bfcache navigation. Existing lifecycle regression remains distinct. Neither the harness nor package inspection proves real router saving, rollback, flashing, hardware status or third-party plugin operation.

**Supported migration target:** fixed official OpenWrt/LuCI above. Other OpenWrt releases, every ImmortalWrt branch and third-party plugins are unverified. Plugins with normal LuCI form/ui structures receive generic presentation adaptation; no comprehensive compatibility claim is made.

## Small router retest list

On a test installation of the fixed new firmware:
- Install, select the theme, log out/in; verify menu ACLs and no-password/recovery notices when relevant.
- Test Classic/M3E, dark/light/system, branding, mobile keyboard and scrolling on your actual browser.
- On a reversible setting, check validation, Save & Apply/rollback and reset; check one dynamic list and nested section.
- Check your actual installed plugins, LED help, table scrolling and status refresh.
- Switch to installed Bootstrap and remove/reinstall MaterialLuCI; verify other themes and menu entries remain.

Keep Bootstrap installed. No real flashing is attempted in CI.
