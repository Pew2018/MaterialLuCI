# Classic/M3E coverage audit — 1.0.1-3

Baseline: 111ca308ec56f1f0aaa6ce7761d16843a70a2a81. Source: theme/root. Duplicate root and other branches are unchanged.

| Family | Evidence / change | Validation scope |
|---|---|---|
| Text/password/number/textarea/readonly | Base readonly fixed light background removed; explicit pre-enhancement paint and transparent decorated input; focused-field deferred adapter retained | Real CSS initial/intermediate frames and real MDC decoration; Chrome/WebKit |
| Simple select | Existing MDC sibling decoration, option/state ownership retained | Existing followup-regression; no forced compound-select conversion |
| Compound select/multiselect/custom/device | Original preview/dropdown/open children kept; more text shadow removed, separator token, wrapping menu and label, bounded viewport width, native checkbox accent/focus | Native-shape fixture; live firmware opening direction/keyboard/input method still needs device testing |
| Dynamic list | Existing pseudo-element event target preserved; authored local close.svg, minimum row height, semantic danger/disabled; M3 item radius; add-row text geometry preserved | CSS fixture and existing add-list regression; target-firmware delete event still needs device test |
| Page/modal/row buttons | Reboot dedicated radius removed; complete row action role includes wireless negative remove; M3 text Add excluded from icon-only geometry | Classic/M3 × light/dark × 390/1100; enhanced submitter/reset existing tests |
| Pending changes | Existing native counter/click remains; role/tab/key adapter, no new click handler; explicit toolbar geometry and inherited foreground | Pinned native ui.changes methods plus isolated persistent HTTP backend across reload |
| UCI diff | Added/removed semantic foreground/background/border, neutral var, nested values preserved; monospace wrap; flex legend; exact nested operation area | Native displayChanges templates, apply(true)/revert transport fixture; real router apply/rollback unverified |
| Interface status/badges | Shared page/modal scope, token body border; removed blanket dark img background; zone inline colors retained | CSS audit; actual firmware status/zone combinations need user verification |
| Charts | White inline host override limited to detected SVG plot; top-level axis line/text only; nested SSID and all curves untouched | Series/label color and owner rescan count fixture; no RPC/scan frequency changes |
| Tabs/cards/SectionValue | Existing native tabs, surface preparation and scroll wrappers retained | Existing UI and lifecycle contracts |
| Modal dimensions | Configuration-specific width and bounded minimum height; intrinsic short dialogs unchanged; original scroll surface retained | Two-tab/long dependent content shapes, real dimensions; no layout measuring loop |
| Progress | View + modal bypass wavy adapter, official MDC 4px; modal 16px bottom inset with reserved 36px; general tasks retain wavy | Real bundled constructors/animation/destruction, repeated waits; existing failure/bfcache checks |
| Sorting | Native handle/above/below/flash/temporary preview CSS; inert cloned preview excluded from feedback construction; no replacement drag listeners | Pinned native desktop methods call map.data.move and preserve actual DOM order; synthetic native touch preview/removal with unchanged ripple instance count; physical touch performance unverified |
| Typography/icons | System/CJK fallbacks, removal of more white halo, local path close glyph; native selection marks retain roles | CSS/font-stack record at fixed DPR/scale; no claim of actual Roboto availability or uniform OS rasterization |
| Tooltip/errors/log/notifications/native progress | Existing role-specific tokens and adapters kept | Existing scoped tests; unknown third-party views not exhaustively validated |

## Limits and upstream evidence
No authenticated router session, target firmware files or device performance trace is available. Browser fixtures cannot certify real RPC latency, radio scan speed, physical touch edge scrolling, actual firmware save/apply/rollback, or Safari on Patrick's device. WebKit here is Playwright WebKit, not that Safari installation. No fabricated graph history, forced loading delay, polling reduction, production audit mode or broad compositing changes.

OpenWrt and ImmortalWrt openwrt-21.02 channel_analysis.js read graph[i] inside channels.forEach(function(channel) {...}) with no callback index. Minimal upstream correction is function(channel, i). Actual firmware version/error must be checked before applying it. No theme override of the business module or global method.

The new close.svg is an original geometric icon, distributed under this repository's Apache-2.0 license. Test-only native excerpts retain LuCI Apache-2.0 provenance; no new remote dependency.
