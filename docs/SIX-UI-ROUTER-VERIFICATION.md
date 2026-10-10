# Six UI repairs — package evidence and router acceptance

Baseline: e7188f7df2d979899e78e151aebb94f7528c4b83
Latest successful run at task start: 38020573064
The router's installed run/commit identity remains unconfirmed.
IPK: luci-theme-materialluci_0.3.0-1_aarch64_cortex-a53.ipk
IPK SHA-256: d440da682b965aea381100b1f8d69b2a0b154ceaf42ea45840165a6ca22aa41f
Audit run: 38021609622 (40461f6ef331b140b67e241f3bde501bd7c44640).
The ZIP artifact digest is NOT the IPK digest.

## Evidence boundary

No connected router URL/session or iPhone was available for this change.
All six items remain **待验证 on a real router**. iPhone Safari chrome and
home-screen display remain **待验证 on a physical iPhone**.
CI uses extracted IPK assets, compiled Lua templates, and pinned upstream
LuCI JS. The preview also supplies the native ui.itemlist compatibility alias on the LuCI prototype for dependency modules. Device/RPC/menu data are read-only fixtures; screenshots are
compatibility evidence, not router or iPhone acceptance.

Baseline package inspection confirms the expected header, CSS, app, wait,
menu, MDC bundles and pause/play icons are present. The source already lacks
the theme About group and already has a parent-button expander. Their continued
appearance/behavior on the router cannot be attributed to a particular cache,
deployment or event conflict without the actual response bytes. Do not claim
that clearing a cache fixes this without comparing those bytes.

## Changes and rationale

| Item | Proven code limitation / change | Real-device status |
| --- | --- | --- |
| Browser chrome | Neutral media hints were present but followed OS mode, while the page mode could differ. A single unconditional neutral hint now follows page mode; html/body and an 8px edge above the 56px page toolbar stay neutral. The accent is inside the toolbar content. No viewport-fit=cover or translucent standalone status bar is requested. | 待验证 |
| Appearance | Detection now handles LuCI field IDs ending _mediaurlbase and alternative hidden/dropdown controls, as well as native selects. The entire section mounts synchronously open; desktop retains a visible heading and uses 2/3 columns; mobile uses one column. | 待验证 |
| About | Already absent in baseline source. Package assertions now reject the removed theme group. Router response comparison is required if it still appears. LuCI system information is retained. | 待验证 |
| Sidebar/controls | Baseline already has a single native parent button. It retains one hit area/ripple; distinct parent destinations get a parent-specific Overview child. Leaves retain routes, ACL/order still come from ui.menu. Official MDC instances preserve native checkbox authority and a single click/change; polling keeps the original indicator. | 待验证 |
| Surfaces | Old base white gradients, active blue and light text needed semantic overrides. Full outer groups now own optional cards, including their status boxes and associated tables. Plot containers are identified by SVG series structure rather than URL/style string. Separate canvas/card/status layers and neutral grid/text override inline plot whites, with series colors preserved. | 待验证 |
| View loading | Old progress was mounted inside #view, whose children LuCI DOM.content owns. It is now a sibling before #view, observing body so container replacement is covered; only a direct view loader triggers it. Completion/failure/pagehide destroys the instance. Theme code no longer rewrites LuCI failure text. | 待验证 |

## After installing the candidate

The candidate is release 0.3.0-2, so opkg can distinguish it from 0.3.0-1.
Do not install a ZIP directly. Extract its IPK. Compare its SHA-256 against
package-audit.json in the matching Actions previews artifact.
Install the IPK using the router's existing package installation workflow.

Open the page and inspect these DOM values in Web Inspector:
- meta[name=materialluci-build] must equal the candidate Actions commit SHA.
- meta[name=materialluci-cache] must equal 0.3.0-2 plus the short commit suffix.
- Every theme JS/CSS URL must have the same v= cache suffix.
- The menu adapter is a build-specific materialluci-menu-v... filename.
- GET /luci-static/materialluci/build.json?v=<cache> must contain the same
  commit/run ID and per-file SHA-256 map.

Compare the actual response bodies (not only URLs) to build.json/package-audit.
If header SHA is old: inspect installed package and LuCI template cache.
If header is new but JS/CSS bytes are old: inspect browser/proxy caching.
If bytes match but visuals differ: capture computed CSS matched rules,
actual menu data/DOM and console errors before changing any styles.
A hard refresh alone is not proof of the resource identity.

## Acceptance matrix

For each row record URL, commit/cache, response hashes, browser/OS, screenshot,
observed behavior and pass/fail. Do not publish cookies or session tokens.

1. Actual iPhone Safari: light/dark × toolbar on/off, at top/scrolled/bounce,
   drawer closed/open; verify system status area, address bar and bottom
   toolbar stay neutral while the page toolbar stays readable and accented.
2. Repeat from a home-screen shortcut. Browser metadata is a hint; Safari
   owns its chrome. apple-mobile-web-app-status-bar-style=default only applies
   if the launch mode is standalone. This theme does not opt users into
   standalone or remove browser UI. OS/Safari settings cannot be forced by CSS.
3. System settings Language and Style: first render open, no About group,
   resize 390→1280→390, no hidden body, flash, crop or document overflow.
4. Real menu: Status/System/Services/Network row, label and arrow; one toggle,
   no navigation, aria-expanded and keyboard Enter/Space; every leaf route works.
5. Boolean fields: inventory actual form controls, MDC instance initialized,
   one native change, correct checked/disabled/reset values and form submission.
   Group/list selection checkboxes keep their original semantics.
6. Polling: pause/resume icon is 48px, accessible name and poll state agree.
7. IPv4 upstream, MT7981 radio/SSID/station table and all realtime charts:
   light/dark × grouped cards on/off; inspect gradients, text/icon contrast,
   separators, plot grid/labels/legend and semantic state/series colors.
8. Actual view loading (throttle a real route's RPC/module/SVG response):
   #view > .spinning has one visible moving MDC line before #view; cleanup on
   success/failure/replacement/navigation; reduced motion remains visibly static.
   Determinate upload/status progress must keep its original semantics.

Official references:
https://developer.apple.com/videos/play/wwdc2021/10029/
https://webkit.org/blog/11989/new-webkit-features-in-safari-15/
https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html

## CI verification record

Run 38022575212, commit 1e64f4af9241cd1f5774ef912ad6aab4be3400f2: passed extracted-IPK assertions, per-resource HTTP byte/hash checks, mobile/desktop Chromium and WebKit, official MDC/native field events, actual upstream network/wireless renderers and realtime load SVG. Screenshot contact sheets were visually reviewed. This is CI evidence only. Later build identity is always in that run's package-audit.json and Actions summary.
