# M3E development phase one
Base: e5ee53e3d62d64bc29a62a479cfaa0aada0b14ea. Development branch: feature/m3e-theme.
Classic remains the default. Browser-local design preference (classic/m3e) takes effect on the next full page load. Changing a style never automatically reloads or saves LuCI configuration.

## Layer contracts
- Shared shell and all LuCI business DOM, forms, tables, routes and operations stay in existing modules.
- startup.js separates activeDesign from the pending preference. Existing data-theme still controls light/dark.
- palette.js retains the Classic algorithm. palette-m3.js bundles official Material Color Utilities 0.4.0 SchemeTonalSpot at contrast 0, and publishes semantic M3 roles plus a legacy variable bridge.
- components.js owns presentation factories and delegates LuCI fields to existing MDC adapters. Only browser appearance checkboxes and appearance mode/style buttons mount official Material Web components. The native checkbox remains authoritative and receives click/change exactly once.
- wait.js retains task/modal/view lifecycle, mounting either MDC or official M3 linear progress in the existing outside-view/outside-business-modal host.
- design-m3.css controls only the M3 layer. Shared shell dimensions are untouched. Swatches, HEX input, LuCI rich dropdowns, file controls and all business buttons remain native/MDC.
- Official Material Web 2.5.0 is M3, not a complete M3 Expressive implementation. This branch establishes an experimental expressive-ready foundation.
- Dependencies are pinned directly; transitive dependencies are currently resolved by npm install (no repository lockfile yet). Offline IPK includes bundles and dependency licenses. Both component bundles are downloaded locally at startup; only the active design mounts controls. Conditional loading is deferred.

## Validation and limits
Actions builds only aarch64_cortex-a53 / mediatek/mt7981. Existing Classic browser suite runs unchanged plus dual-style tests in Chromium and Playwright WebKit. Tests serve resources extracted from the final IPK and assert package commit/cache/resource hashes. New tests cover pending style without losing a draft, preserved shell coordinates, switch event counts and keyboard activation, programmatic state, inherited fieldset disablement and re-enable, progress lifecycle, missing-component fallback and return to Classic. MCU tests compare packaged roles against the pinned official package and basic text contrast.
Screenshots are review evidence, not real firmware verification. Playwright WebKit is not real iPhone Safari. Vendor pages, plugin CSS, real credential autofill and real backup/restore/flash/reboot workflows remain outside this phase. No real destructive operation is invoked.
