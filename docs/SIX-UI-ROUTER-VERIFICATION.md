# Six UI fixes — implementation and router verification

Baseline: `8824643657d1da2db39295695bfa700981db8a76`.
Branch: `feature/classic-native-v1`. No shared LuCI core files are changed.

## Root causes and changes

| Issue | Evidence and fix |
| --- | --- |
| Refresh/pause | Pinned LuCI `luci.js` creates `span[data-indicator=poll-status][data-clickable]`; its handler calls Request.poll.start/stop. `ui.js` later updates the first text node and data-style. The theme preserves that DOM and handler, styles only this indicator, and derives its accessible action from data-style=inactive. |
| Drawer | feedback.js excluded ml-nav-parent and bound its outer ml-nav-row-action. Feedback now binds only the complete parent button; arrow has no pointer events or independent surface. Native button keyboard activation and original submenu links remain. |
| Surfaces | app.js marked maincontent as a surface and only inspected immediate children; CSS also independently marked CBI groups. Main/view/map are now containers, semantic leaf groups are surfaces, and embedded iface badges/tables are flat. Neutral status headings use log surface; colored zone headings keep their original inline color and contrast treatment. |
| Browser chrome | No theme-color/Apple status-color meta was found in header, sysauth, palette or startup. viewport-fit=cover plus toolbar top inset could paint an extra top strip. Default viewport safe-area handling is restored and toolbar stays 56px. Actual browser chrome color is browser-controlled. |
| Loading | LuCI View.__init__ puts a direct .spinning child in #view and replaces it after load AND render resolve. wait.js now observes that structural lifecycle immediately, independently of menu tasks. LuCI danger notifications/rejected loads remove animation and provide readable failure text. Modal countdown/opkg progress adapter remains separate. |
| Switches | Existing code manually toggled classes while the official instance also toggled; track/handle styling overpainted official pseudo elements. MDCSwitch now owns presentation state; the original checkbox remains field authority. Its native click retains original click/input/change business events once. Property setters, attribute observation, reset and destruction synchronize/clean up the instance. Sass switch.theme sets classic MD1 colors/proportions. |

## Scope of switch conversion

- Theme settings: four Boolean preferences (cards, toolbar, category headings, icons).
- Single LuCI ui.Checkbox and legacy CBI Boolean fields: converted with an actual MDCSwitch.
- A single checkbox in a cbi-value-field, including a labeled plugin Boolean: eligible.
- Multiple checkbox fields, dropdown multi-selection and role=group: retained as checkbox.
- Standalone modal checkboxes without an identified Boolean field: retained.
- Individual Boolean table cells are eligible; table presence alone is not an exclusion.
- Plugin controls outside these semantic structures cannot be safely classified without their source/DOM. Runtime inventory in preview artifacts records the fixture coverage, not all router plugins.

v14's icon-bearing design differs from MD1. The theme uses official movement, state layers,
focus ring and pseudo surfaces, with a 36×14 track, 20px thumb, neutral OFF and accent ON,
48px touch target and no visible thumb icons. Disabled states remain distinguishable.

LuCI configuration switches represent an unsaved field until the existing Save/Apply action.
Appearance preferences are browser-local and immediate.

## Validation and preview identity

Actions builds the IPK before tests. Browser fixtures load the exact staged assets,
compiled theme Lua templates and pinned upstream LuCI JS. Chromium and WebKit execute
the existing suite plus ci/six-ui.mjs. Tests cover the real poll implementation,
drawer text/arrow feedback, native field events and official instance state, external
setters/attributes/reset, simulated plugin surfaces, real View.__init__ success/failure,
advancing animation and absence of browser-color meta.

Preview artifact contains PNGs, commit.txt and assets.sha256. Existing desktop/light/dark/
drawer previews remain; new previews include refresh-running/paused, status-loading/loaded,
and rate-light/dark. Rate previews use representative DOM with mocked data; they are
not screenshots from an installed router plugin.

## Still requiring the actual router and mobile browser

1. Install the successful run's IPK, bypass old cached resources once, and compare JS/CSS
   cache query suffixes and bytes with assets.sha256. A matching fixture does not prove
   the phone loaded the updated package.
2. On the real status page, verify Refresh stops new polling and Resume restarts it,
   with the underlying RPC sequence unchanged and without document reload.
3. Tap group text, blank row area and chevron. Check one wave, one expansion, scrolling
   cancellation, selected-page ancestor expansion and drawer focus.
4. Inspect status overview's IPv4 upstream, actual rate-control plugin and device tables.
   Record their DOM, computed styles, stylesheet/inline origins, narrow layout and
   light/dark/cards-on/cards-off. These installed plugin files were not supplied.
5. Check ordinary browser tab, narrow landscape, fullscreen/PWA and keyboard safe areas.
   No theme meta requests browser tint; browsers may still select their own colors.
6. Check cold status loading, RPC/load/render failure, navigation away, apply countdown,
   rollback modal and opkg on the firmware's precise LuCI version.
7. Inventory all installed plugin Boolean fields versus selection checkboxes. Verify ON,
   OFF, disabled ON/OFF, focus, external dependencies, reset and saved submission.
   Do not call uninspected custom plugin switches fully converted.
