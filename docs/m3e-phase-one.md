# M3E development phase one
Base: e5ee53e3d62d64bc29a62a479cfaa0aada0b14ea. Development branch: feature/m3e-theme.
Classic remains the default. Browser-local design preference (classic/m3e) takes effect on the next full page load. Changing a style never automatically reloads or saves LuCI configuration.

## Layer contracts
- Shared shell and all LuCI business DOM, forms, tables, routes and operations stay in existing modules.
- startup.js separates activeDesign from the pending preference. Existing data-theme still controls light/dark.
- palette.js retains the Classic algorithm. palette-m3.js bundles official Material Color Utilities 0.4.0 SchemeTonalSpot at contrast 0, and publishes semantic M3 roles plus a legacy variable bridge.
- components.js owns presentation factories and delegates LuCI fields to existing MDC adapters. Eligible native boolean/selection fields and appearance actions mount official Material Web components. The native checkbox remains authoritative and receives click/change exactly once.
- wait.js retains task/modal/view lifecycle, mounting either MDC or project-owned Expressive wavy progress in the existing outside-view/outside-business-modal host.
- design-m3.css controls only the M3 layer. Shared shell dimensions are untouched. Swatches, HEX input, rich dropdowns, file controls and business buttons retain native DOM. M3E surfaces and official md-ripple provide presentation.
- Official Material Web 2.5.0 is M3, not a complete M3 Expressive implementation. This branch establishes an experimental expressive-ready foundation.
- Dependencies are pinned directly; transitive dependencies are currently resolved by npm install (no repository lockfile yet). Offline IPK includes bundles and dependency licenses. Both component bundles are downloaded locally at startup; only the active design mounts controls. Conditional loading is deferred.

## Validation and limits
Actions builds only aarch64_cortex-a53 / mediatek/mt7981. Existing Classic browser suite runs unchanged plus dual-style tests in Chromium and Playwright WebKit. Tests serve resources extracted from the final IPK and assert package commit/cache/resource hashes. New tests cover pending style without losing a draft, preserved shell coordinates, switch event counts and keyboard activation, programmatic state, inherited fieldset disablement and re-enable, progress lifecycle, missing-component fallback and return to Classic. MCU tests compare packaged roles against the pinned official package and basic text contrast.
Screenshots are review evidence, not real firmware verification. Playwright WebKit is not real iPhone Safari. Vendor pages, plugin CSS, real credential autofill and real backup/restore/flash/reboot workflows remain outside this phase. No real destructive operation is invoked.

## M3 controls and loading corrections (0.3.0-10)
- The active M3 design now adapts eligible LuCI boolean fields to official md-switch, and eligible original checkbox/radio frames to md-checkbox/md-radio. Original inputs remain the only named form controls; adapters forward a native click and retain LuCI widget ownership.
- Browser appearance text actions use official md-text-button. Swatches and business submit/reset buttons retain their established native behavior.
- Load Material Web and the adapter before selection enhancement. Classic continues to use MDC; unavailable Material Web controls fall back to MDC.
- M3 progress preserves the official track shape and shadow-tree animation. Loading views suppress the legacy spinner only while the dedicated loader exists.
- Modal progress follows MDC opening transforms through requestAnimationFrame; ResizeObserver alone cannot track transform geometry. The track remains outside the business modal children so apply countdown content replacement does not recreate its animation.
- Browser tests exercise real LuCI View.__init__ and changes.displayStatus, live shadow animations, countdown stability, painted track geometry, native switch events, checkbox/radio grouping, inherited disablement and form payloads in Chromium/WebKit.

## System layout and Expressive controls (0.3.0-11)
- Inactive native LuCI tab panes use display:none in M3E, preventing height-zero panes from retaining surface padding or focusable controls.
- Ordinary desktop focus/viewport changes do not programmatically reposition the document. Mobile keyboard and modal reveal remain supported.
- SSH/dynamic-list add rows have a full-width editor and a 48px, wrapping action instead of a tiny intrinsic-width editor.
- Busy modal, task and view loaders use a project-owned SVG wavy progress adapter, based on Google's M3 Expressive wavy indicator guidance (https://github.com/material-components/material-components-android/blob/master/docs/components/ProgressIndicator.md). Material Web 2.5.0 supplies only ordinary M3 linear progress; this adapter is not an official Google web component. Motion respects reduced-motion and cleanup disconnects geometry observers.
- Native LuCI actions/tabs now use Google's md-ripple; the original DOM target, submitter/reset behavior and callbacks remain authoritative. Filled fields/selects, action shapes, menus, cards and dialogs receive M3 semantic surfaces and geometry through theme CSS. Text fields/select menus continue to use MDC interaction logic; they are not new official Material Web fields.
- Actual pinned upstream system and SSH renderers now run in Chromium/WebKit at mobile/desktop widths, covering all four reported system tabs, inactive-pane geometry, stable scroll/document height, textarea editing, SSH invalid-key callbacks and reduced-motion loaders.
