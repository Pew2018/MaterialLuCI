# MDC control integration audit: 0.3.0-5

Development branch only: feature/classic-native-v1. The frozen backup and main are unchanged.

## Screenshot regressions addressed

- Desktop toolbar: remove the explicit 8px neutral padding at desktop widths. The 56px MD1 content height and sidebar offset match. Mobile retains the neutral browser boundary and safe area surfaces. Theme-color remains neutral, independent of toolbar accent.
- Short apply notices: LuCI reuses one modal node as MDC container/surface/content. MDC container height:100% and content flex-grow must not stretch that node. Reset height/min-height/flex on the LuCI modal; cap ordinary dialogs at 560px and keep configuration tables / package logs up to 900px. Remove the legacy alert border only inside modal surfaces. Inline status notices retain their semantic styling.
- Apply dropdown seam: make the legacy arrow divider transparent; preserve the border's layout width and the original LuCI arrow/selection handlers. This is a visual change, not a replacement of the split-button business behavior.

## Components currently integrated

Pinned @material packages 14.0.0 are bundled locally: button, icon-button, ripple, switch, textfield, checkbox, radio, form-field, dialog, linear-progress. LuCI owns fields, navigation, permissions, submissions and business callbacks. MD1 geometry, typography and neutral surfaces are supplied by the theme.

## Further component candidates

1. MDC menu / menu-surface: best next candidate for theme-owned action menus. Keep LuCI apply, unchecked apply and selection callback semantics; adapter tests must cover keyboard, focus restoration, disabled items, placement and narrow viewports before migrating LuCI dropdowns.
2. MDC select: evaluate simple single-selection fields first. Existing LuCI complex dropdowns support multiple selection, custom values and dynamic options which must not be lost. Preserve native values, change count, validation and dependent fields.
3. MDC snackbar: suitable for optional nonblocking theme preference feedback. Do not substitute a timed snackbar for configuration apply/rollback or critical warnings.
4. MDC tooltip: optional accessible descriptions for icon-only controls; retain accessible names and touch operation.

Do not replace sidebar expansion, LuCI tabs, routes or modal dismissal behavior merely to increase component count.

Official references:
- https://github.com/material-components/material-components-web/blob/v14.0.0/packages/mdc-dialog/README.md
- https://github.com/material-components/material-components-web/blob/v14.0.0/packages/mdc-menu/README.md
- https://github.com/material-components/material-components-web/blob/v14.0.0/packages/mdc-select/README.md
- https://github.com/material-components/material-components-web/blob/v14.0.0/packages/mdc-snackbar/README.md

## Verification boundary

CI audits resources extracted from the actual IPK and invokes the pinned upstream LuCI status/modal/dropdown APIs in desktop/mobile Chromium and WebKit. It asserts short notice geometry, no modal accent border, dropdown selection, toolbar geometry and neutral hints; screenshots accompany artifacts. Read-only fixture data is mocked. Patrick's installed VM and actual iPhone Safari remain **待验证** after this update. Desktop WebKit is not iPhone browser chrome evidence.
