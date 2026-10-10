# Classic Native refinements — 2026-10-10

Work only on `feature/classic-native-v1`, starting at `12824ed1ca2ca8e65b26892f9f88089976f6edb5`. Main is unchanged. Build packages only in GitHub Actions.

## Evidence and design decisions

The eight supplied router Safari screenshots show multiple simultaneously expanded groups, synthetic “系统 · 概览 / 服务 · 概览 / 网络 · 概览” links, a character chevron, mismatched group borders and uneven theme settings placement, an outlined reset action and custom underlined inputs. Screenshots demonstrate the old visible result, not the candidate deployment identity.

Follow docs/TurboIMS-Classic-WebUI-Design-Spec-v1.0.md sections 4–6 and 10: shared font stack, 16px regular setting titles, 13px group headings, compact 68px switch rows, 48px buttons, 2px corners and a restrained secondary surface. Desktop adaptation deliberately uses two useful columns instead of the original mobile module's 620px page limit.

1. Sidebar: choose one initially active group; opening a group closes all others and updates hidden/aria-expanded together. Enter and Space remain native button interactions. A group can be closed leaving none open. Existing real children and leaves are retained.
2. Arrow: MDC Web has no standalone arrow component. Its icon-button documentation explicitly recommends MDC Button for icon+text. Use the locally compiled official MDC Button styles for the single parent control, with Google's Apache-licensed expand_more SVG; preserve the specification's single confirmed-tap feedback rather than adding a separate icon button/ripple.
3. Remove only synthetic parent-overview destinations. This deliberately follows the latest request overriding the earlier request to insert distinct parent destinations as overview links. Upstream real child destinations remain untouched.
4. Appearance: ordered general/ranges, paired palettes, then custom accent; explicit desktop grid areas align group headings and separators. Mobile keeps the same logical order in one column. Both first desktop groups omit stray top dividers.
5. Typography: all appearance content and MDC fields use the body font stack, including Chinese system fallback. Typography roles remain intentionally different sizes.
6. Reset: upstream flash.js uses form.Button inputstyle='negative important'. The shared negative action style now uses the same 48px height, 112px minimum width, 2px corners and secondary surface as other actions, with semantic danger ink. Reset logic, permission checks and confirmations are unchanged.
7. Inputs: replace CSS-only decoration with locally bundled @material/textfield 14.0.0 (official JS, styles and MDCLineRipple). Adapt ORIGINAL input/textarea elements with no-label filled fields because LuCI already provides labels. Preserve widget frames, textarea firstElementChild, password reveal adjacency, IDs, names, drafts, submit events, disabled/readonly and validation. LuCI is the validation authority; MDC does not replace its validators. Hidden/file/checkbox/radio/button/select types keep their respective native widgets.

Sources: [MDC Text Field](https://github.com/material-components/material-components-web/blob/v14.0.0/packages/mdc-textfield/README.md), [MDC icon buttons](https://github.com/material-components/material-components-web/blob/v14.0.0/packages/mdc-icon-button/README.md), [Material expand_more](https://github.com/google/material-design-icons/blob/master/src/navigation/expand_more/materialicons/24px.svg).

## Validation boundary

Actions audits and tests resources extracted from the actual 0.3.0-3 IPK, including new textfield bundles, official CSS and local SVG; all resource hashes and header cache identify the candidate commit. Chromium and WebKit cover mobile/desktop, resizing, single expansion, native field events/getValue/setValue, textarea frame identity, password reveal, disabled/readonly/errors and reset action styling. Reset in the fixture uses a harmless handler and never runs firstboot. Device/RPC data are mocked; upstream LuCI form widgets and view renderers are real.

New screenshots include settings, sidebar, MDC input fields and reset buttons, alongside existing status/wireless/realtime/progress coverage. Candidate appearance and all seven interactions on the user's router, iPhone Safari and home-screen mode remain **待验证** until installed and checked. Desktop WebKit cannot prove iPhone chrome behavior.

After installation, open /luci-static/materialluci/build.json with a unique query token; compare commit/run_id and cache with the Actions package audit. Header materialluci-build and materialluci-cache must match it. Inspect actual script/CSS URLs and response bytes/hashes, including mdc-textfield.js, textfield.js and icons/expand-more.svg. Hard reload once; if identity disagrees, fix installation/cache before assessing behavior.

Regression checks also caught focus loss when decorating an already focused legacy input; initialization now waits for its natural blur. Modal progress positioning now synchronizes immediately on viewport/geometry events, then checks again on the next animation frame, avoiding stale desktop coordinates during WebKit resizing.
