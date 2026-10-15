# Scoped UI repair
Baseline: b23289086d27e0c066a588b990202af582ed10e6, 1.0.1. Package source: theme/root.
Revision: 1.0.1-1; resource cache continues to derive from package metadata plus source SHA.
Duplicate root is intentionally untouched.

## Confirmed changes
- Explicit progress scene: view forces official MDCLinearProgress, modal and generic tasks retain design-dependent feedback. Native determinate bars untouched.
- 16px applies only to wavy engine hosts. MDC view stays 4px; M3 palette controls ink/track.
- Shared card radius/padding/gap/shadow tokens replace duplicate ordinary card rules, ID-level legacy-main radius and segmented first/last radius literals.
- Card inventory: ordinary section/map/tab/SectionValue owns one classified surface; flat view uses #view; Lua reboot uses #maincontent; legacy flash uses native continuous start/body/end; classified plot and table scroll hosts share ordinary surface rules. Nested plot/table inside an existing card stays transparent.
- Segmented native multipart groups intentionally have no individual elevation shadows: separate shadows would expose seams. Their backgrounds, outer radius and horizontal padding share card tokens.
- Cards-off removes surface radius/background/shadow/padding, including segmented groups. Loading stays light and transparent, using shared typography/spacing without creating an outer page card.
- M3 business CSS covers plain buttons in main/modal, a.btn, native input button/submit/reset including nested forms, existing input wrappers, text actions and compact table controls. Icon/add/up/down actions remain compact; shell/settings controls and selection adapters excluded.
- No new input wrapping or event interception. Unwrapped void input controls get native CSS/focus/disabled feedback; official ripples remain on supported original buttons/links and existing wrappers. Existing dropdown .open ordering is unchanged.
- Surfaces discovery/runtime/branding/viewport/LED rules unchanged.

## Evidence boundary
Default build retains lightweight performance/lifecycle contracts and actual IPK audit. A separate scoped Actions job loads actual packaged engines and checks representative DOM/CSS, lifecycle, submission/reset, fieldset disable restoration, dynamic ripple uniqueness and card variants; Chromium only, no long sampling or whole-site screenshot matrix.
Representative pages do not prove every router page, Safari rendering or scroll performance. User retest: loading transition, modal waits, both styles/light/dark/cards, flat/section/legacy/plot/wide-table, native/link/input/dynamic actions, save/apply/reset/disable and scroll.
No main, modern-luci, archived branch or duplicate root changes. Modern-luci may need equivalent presentation changes later; no synchronization performed.
