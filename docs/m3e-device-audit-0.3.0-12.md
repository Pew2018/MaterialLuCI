# M3E device report follow-up — 0.3.0-12

Baseline: feature/m3e-theme HEAD 4d5ede5c164fbf3791d5296d36cfc2f1e3085cb2, package 0.3.0-11, Actions 38151004295. Nine uploaded desktop Safari screenshots inspected. Footer identifies ImmortalWrt 21.02-SNAPSHOT r20651-02fff2aebc. No access to the router DOM, installed file hashes, Safari timeline or exact firmware LuCI source revision was available.

## Evidence and corrections

- startup.js defaulted to Classic even in the M3E development package. Stored Classic remains authoritative; a missing preference now defaults to M3E. requestedDesign/designFallback expose palette fallback instead of hiding it. A saved Classic preference must be changed in Appearance and the page reloaded. Screenshot geometry is consistent with Classic, but screenshots alone do not prove a resource hash or activeDesign.
- design-m3.css scoped native tab visibility, textarea nonstretch and dynlist width fixes to M3E. Classic/fallback paths did not receive them. Shared cascade.css now applies native pane visibility and stable flex geometry in both styles. No scroll lock, document height cap or forced scroll reset added.
- SSH 21.02 renderer contains .cbi-dynlist > .add-item > INPUT + BUTTON, not two buttons; renderKeys also relies on the list's last child being .add-item. The theme leaves this order, Enter, drop/FileReader, decoder and fs.write handlers intact. Shared list width fixes cover standalone lists outside .cbi-value-field, which were previously auto-sized.
- extras.js rescanned document on unrelated added elements; each known tooltip rewrote text unnecessarily. Text-node filtering means this is NOT proof of an endless observer feedback loop. Updates are now value guarded, decoration excluded and minimal changed roots processed once per animation frame.
- Each M3 switch/selection/ripple installed a whole-body disabled-state observer. components.js and feedback.js now share one state observer each and only synchronize affected controls.
- app.js coalesces nested pending roots. wait.js disconnects a superseded modal observer and excludes progress-owned mutations. Existing original loader/countdown lifecycle remains automatic.
- Continuous physical Safari upward scrolling has NOT been reproduced or attributed to a proven unique cause. These are source-proven defects and mitigations; the 30-second acceptance evidence must not be presented as physical-router confirmation.

## Source and coverage

Official documentation: https://m3.material.io/components/progress-indicators/overview
Official web API/source: https://github.com/material-components/material-web/blob/v2.5.0/progress/internal/linear-progress.ts
Official ripple: https://github.com/material-components/material-web/blob/v2.5.0/ripple/internal/ripple.ts
Official Android wavy reference: https://github.com/material-components/material-components-android/blob/master/docs/components/ProgressIndicator.md

| Control | Actual runtime source | Limitation |
| --- | --- | --- |
| M3 appearance outlined/text buttons | Google Material Web 2.5 | Native LuCI action buttons remain original nodes |
| Boolean switches | Google md-switch via original-input adapter | MDC switch fallback when registration unavailable |
| Supported checkbox/radio frames | Google md-checkbox/md-radio adapters | Rich dropdown/list-owned selections stay LuCI native |
| Action/sidebar ripple | Google md-ripple in M3; MDC foundation in Classic | Official touch recognition has 150ms hold delay; no business callback replacement |
| Text/password/number/textarea | MDCTextField with theme M3 surface | Not official Material Web textfield migration |
| Ordinary selects | MDCSelect/MDCMenu with original select | Multiple/optgroup/rich LuCI selectors remain native |
| Rich dropdown/dynamic list | Original LuCI behavior + theme CSS | Not official M3 component migration |
| Tabs | LuCI tabs + theme state styles | No official tab replacement |
| Tooltips/notifications/dialogs | MDC tooltip/snackbar/dialog adapters | LuCI modal node order retained |
| Indeterminate waiting/view progress | Theme-owned SVG Expressive adaptation | NOT Google official Web component; no random percentages |
| Determinate cbi-progressbar | Original LuCI values + theme CSS | Not official M3 migration |
| File selector/upload/footer actions | Original controls + theme CSS/feedback | Native picker and original upload events retained |

Material Web md-linear-progress is ordinary M3. The shipped wave is project-owned; Android wavy references are design references, not a claimed web port. Existing SVG dash animation is retained pending further physical Safari evidence.

## Test audit and verification boundaries

The pre-existing upstream SHA e4c46338b196e486a88b1a75b78e283708c82bc4 IS OpenWrt 21.02, not a modern-version mismatch. The exact ImmortalWrt firmware build remains unknown. Previous system tests forced M3E, ran stability checks for 1.2 seconds and disabled system poll.add. New acceptance tests exercise default and explicit Classic, keep a real scheduled polling callback with deterministic data, observe each of four tabs for 30 seconds, resize/visualViewport notifications, final IPK assets, SSH invalid/valid/duplicate/Enter/drop operations, and a separate real status syslog renderer.

Performance JSON includes baseline/candidate full-document scan count/time, observer callbacks/records, long tasks, frame intervals and candidate component counts. Baseline overrides presentation assets from the failing commit while reusing identical compiled dependency bundles; this is a browser presentation comparison, not an installed-router benchmark.

Existing full regression suite remains. No tests are deleted. Classic suites explicitly select their intended design. New package-default behavior is independently tested. Existing configuration progress test invokes LuCI changes.displayStatus (not theme sync) and View.__init__, but does not prove a real ubus apply/reconnect lifecycle.

Pending: physical macOS/iOS Safari, exact firmware fork DOM, actual save/apply/reconnect and readonly SSH ACL on device. No cache corruption is asserted without loaded-resource hash evidence.

## Visual-review correction

Actions 38153062456 passed, but manual review of its valid-key mobile screenshot found base64 text overflowing the SSH items. This exposed an acceptance gap: only the add row had been measured. Shared CSS now wraps only native SSH [data-key] item text without moving its nodes or changing its pseudo-element delete hit target. Acceptance additionally checks document and item overflow after valid Enter/click/drop, exercises the native nodespec readonly branch, screenshots each system pane and status syslog, and repeats tab switches. Final package must come from the rerun containing this correction.

Additional ripple probes use automatic DOM enhancement, native mouse/keyboard/touchscreen tap, cancelled pointer sequences, inherited disabled behavior and before/after component counts. Chromium additionally uses a CDP browser touch gesture and checks scrolling without ripple/action activation. WebKit cancellation is synthetic; physical Safari touch scroll is still pending. The probe counts actual Web Animations calls on the ripple surface and records pointer-to-animation latency; it does not infer smoothness solely from animation state.
