# MDC extras and surfaces — 0.3.0-6

Development branch only. Main and the frozen backup are unchanged.

## Surface hierarchy

Classic Material shape (2px), restrained elevation and neutral surfaces are retained. Original MD1 did not specify a complete modern dark-theme token system; the dark adaptation follows Material's neutral dark backgrounds and lighter elevated surfaces.

Light: canvas/sidebar #FAFAFA; cards and raised surfaces #FFFFFF; inset/log #F5F5F5.
Dark: canvas #121212; sidebar/inset #181818; cards/ordinary content #1E1E1E (roughly the 1dp white overlay); menus/dialogs #2D2D2D (higher elevation). Primary text uses 87% white, secondary 60%; dividers use 12% white. Semantic network zone/status colors remain.

Card identification includes standalone CBI section nodes, fieldsets, complete status groups, table scroll containers at view/map level, and structural SVG chart containers. The outermost complete semantic group owns the card; rows and nested groups do not gain duplicate surfaces. No page URL or inline-white-string matching. Cards-off removes the optional surface, padding and shadow.

## Official locally bundled components

@material/menu, menu-surface, list, select, snackbar and tooltip are pinned to 14.0.0, alongside existing controls. CSS/JS are packaged in the IPK without CDNs.

- Menu/menu-surface: canonical MDC popup/list in a body portal. LuCI apply dropdown arrow opens it; menu selection dispatches the native cbi-dropdown-select event on the original option, keeping apply/unchecked apply callbacks and hidden values. Original first/last child identities are retained. Multiple/custom-value dropdowns keep their native behavior. Theme-owned menus are available through MaterialExtras.menu.
- Select: only simple HTML single selects without optgroups/size lists qualify. The original select is never moved or replaced, stays firstChild and remains the sole named form field. A sibling MDC select mirrors it. One accepted selection sends one native input/change; programmatic values, per-option selected setters, dynamic options, disabled state, required/custom validation and resets synchronize without synthetic field changes. Multi/custom LuCI widgets retain their capabilities.
- Snackbar: theme preference feedback only. Configuration apply/rollback, errors and business dialogs remain LuCI-owned.
- Tooltip: official plain tooltip for icon controls, preserving accessible names and existing descriptions. Touch activation is informational and never substitutes for the control's action.

Menu portals close on page/viewport scrolling or resize, but allow their own lists to scroll. Components clean up when original nodes are removed; bfcache pagehide preserves live instances.

## Actions validation

Actual IPK resources and hashes are audited, templates compiled, and original pinned LuCI APIs exercised with read-only mocked data. Chromium/WebKit tests cover mobile/desktop menu placement, Escape/focus restoration, disabled choices, native callbacks and child contracts; simple-select values, single native change, dynamic options and disabled/unsupported fields; snackbar/tooltip and cards-on/off surfaces. Screenshots are emitted. Installed router/Patrick VM and physical iPhone Safari remain 待验证.
