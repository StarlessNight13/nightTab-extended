# Icon and Image System Implementation Plan

## Goal

Extend nightTab's existing bookmark visual system without replacing its current behavior.

The fork should:

- keep existing Font Awesome icons working;
- add a larger free icon catalog through Iconify;
- use Lucide for general UI and utility icons;
- use Simple Icons for monochrome company and product brands;
- use SVG Logos for colored company and product logos;
- add Original, Monochrome, and Accent appearance modes;
- support global visual defaults and per-bookmark overrides;
- support custom images without forcing destructive image processing;
- work offline after the extension is installed;
- keep existing nightTab data and imports compatible.

The implementation should extend the existing visual model instead of rewriting it from scratch.

## Phase 1: Audit the Current Visual System

Before changing code, locate and document all code related to:

- bookmark `visual.type`;
- letter, icon, and image rendering;
- Font Awesome icon data and rendering;
- icon picker and icon search;
- bookmark add/edit UI;
- live bookmark preview;
- bookmark accent handling;
- global theme accent handling;
- state defaults;
- state migrations;
- import/export;
- bookmark copy and "apply to all" behavior;
- webpack asset handling;
- Chrome and Firefox extension builds.

The audit should identify the smallest set of integration points needed for the new system.

Do not start by replacing the current visual implementation.

## Phase 2: Extend the Data Model

Add an explicit icon provider.

Existing icon data without a provider must continue to mean Font Awesome.

Example legacy-compatible icon:

```json
{
  "provider": "fontawesome",
  "name": "github",
  "prefix": "fab",
  "label": "GitHub"
}
```

Example Iconify icon:

```json
{
  "provider": "iconify",
  "name": "simple-icons:github",
  "label": "GitHub"
}
```

Example Lucide icon:

```json
{
  "provider": "iconify",
  "name": "lucide:terminal",
  "label": "Terminal"
}
```

Add a visual appearance setting that can be shared by icons and images:

```json
{
  "visual": {
    "type": "icon",
    "style": {
      "mode": "original",
      "useGlobal": true
    }
  }
}
```

Supported modes:

- `original`
- `monochrome`
- `accent`

Do not store the resolved theme accent color inside each bookmark when `mode` is `accent`. Resolve the active theme accent at render time.

## Phase 3: Backward-Compatible Migration

Add a migration path for existing data.

Rules:

- missing `provider` on existing icons -> `fontawesome`;
- missing appearance settings -> preserve the old visual appearance;
- old imports must work without manual conversion;
- unknown future provider data should be preserved where possible;
- failed or unknown visuals must not break the complete bookmark list.

Old nightTab bookmarks must look the same after the update unless the user changes their visual settings.

## Phase 4: Introduce a Shared Visual Renderer

Create one rendering boundary for bookmark visuals.

Conceptually:

```text
VisualRenderer
├── LetterRenderer
├── IconRenderer
│   ├── FontAwesomeRenderer
│   └── IconifyRenderer
└── ImageRenderer
```

The renderer should receive enough information to resolve:

- visual type;
- icon provider and icon ID;
- image source;
- local or global appearance mode;
- active theme accent;
- fallback visual.

The bookmark preview and the final bookmark must use the same rendering path.

Do not maintain separate styling logic for previews.

## Phase 5: Move Existing Font Awesome Rendering Behind the Renderer

Before adding new icon providers:

1. keep the current Font Awesome behavior;
2. route it through the new `IconRenderer`;
3. verify existing bookmarks still render correctly;
4. verify save, reload, export, and import behavior.

This gives the new architecture a tested compatibility baseline.

## Phase 6: Add Iconify as the New Icon Backend

Use Iconify as the provider layer for new icon collections.

Initial collections:

- Lucide;
- Simple Icons;
- SVG Logos.

Do not expose all Iconify collections.

Collection roles:

```text
Lucide
-> generic UI, system, utility, folder, terminal, server, settings icons

Simple Icons
-> clean monochrome company and product brands

SVG Logos
-> colored company and product logos
```

Examples:

```text
lucide:terminal
lucide:folder
lucide:server

simple-icons:github
simple-icons:docker
simple-icons:cloudflare

logos:github-icon
logos:docker-icon
logos:cloudflare
```

The extension must not depend on the Iconify API or a CDN during normal use.

Bundle or generate the required metadata/assets locally.

## Phase 7: Keep the Icon System Modular

Use a provider structure instead of hard-coding each collection throughout the UI.

Suggested structure:

```text
icons/
├── index.js
├── renderer.js
├── search.js
└── providers/
    ├── fontawesome.js
    ├── lucide.js
    ├── simple-icons.js
    └── logos.js
```

The exact paths should follow the existing project structure found during the audit.

Each provider should expose a consistent interface for:

- icon lookup;
- display name;
- search metadata;
- rendering data;
- collection information.

Future providers should be addable without changing the bookmark model.

## Phase 8: Avoid Loading the Full Catalog on Startup

Do not put thousands of icon definitions into the initial new-tab render path.

The normal page should load only what is necessary to render saved bookmarks.

The larger searchable catalog should load when the icon picker opens.

Use lazy or dynamic loading where it fits the current webpack setup.

Changing the theme accent should normally update CSS values only. It should not require rebuilding every SVG.

## Phase 9: Build the Unified Icon Picker

Extend or replace the current picker with one searchable interface.

Suggested groups:

```text
[ All ] [ Lucide ] [ Brands ] [ Color Logos ] [ Font Awesome ]
```

The picker should support:

- text search;
- collection filtering;
- keyboard navigation;
- clear selected state;
- accessible icon names;
- live preview;
- existing Font Awesome icons.

A normalized search item can look like:

```js
{
  id: "simple-icons:github",
  provider: "iconify",
  collection: "simple-icons",
  name: "github",
  label: "GitHub"
}
```

Search should consider:

- display name;
- icon name;
- collection;
- available aliases.

## Phase 10: Add Appearance Controls

Add appearance controls to the bookmark visual editor.

Use one exclusive control, not three independent toggles.

Suggested UI:

```text
Appearance

[ ] Use global appearance

Style
[ Original ] [ Monochrome ] [ Accent ]
```

When global appearance is enabled, disable the local style selection.

Add global defaults for at least:

- icon appearance;
- image appearance.

Suggested global settings:

```text
Default Icon Style
[ Original | Monochrome | Accent ]

Default Image Style
[ Original | Monochrome | Accent ]
```

Per-bookmark settings can override these defaults.

## Phase 11: SVG Appearance Modes

SVG-based icons should use real recoloring, not approximate CSS filter chains.

### Original

Preserve the provider's original SVG fills and strokes.

This is especially useful for colored logo collections.

### Monochrome

Normalize compatible SVGs to `currentColor`.

Use the normal icon/text color from the active nightTab theme.

### Accent

Normalize compatible SVGs to `currentColor`, then use the resolved nightTab accent.

Prefer CSS custom properties so a theme accent change updates icons without rewriting bookmark data.

Lucide and Simple Icons should be particularly clean in Monochrome and Accent modes.

## Phase 12: Custom Image Appearance Modes

Images need a separate strategy from SVG icons.

### Original

Render the source unchanged.

### Monochrome

For arbitrary raster images, use non-destructive CSS processing such as grayscale.

Do not rewrite the stored image.

### Accent

Use the best available technique based on the source.

Preferred order:

```text
SVG/currentColor
-> CSS mask for compatible transparent assets
-> CSS filter fallback
```

For transparent raster logos, CSS masking can provide a clean single-color result:

- keep the source image as the mask;
- use the resolved accent as the fill color.

For arbitrary raster images where masking is not suitable, use a CSS filter fallback.

Do not add broad cross-origin permissions or canvas-based image processing only to force arbitrary remote images into an exact accent color.

Accent mode is intended primarily for icons and logo-like images, not photographs.

## Phase 12A: Per-Bookmark Image Filters

### Scope

In this plan, image filtering means non-destructive visual effects on a custom
image used as a bookmark's main visual (`display.visual.type: "image"` and
`display.visual.image.url`). It does not mean filtering an image search
catalog. It also does not replace the existing theme-background image controls
for blur, grayscale, opacity, and vignette.

Apply effects only to the dedicated `.bookmark-display-visual-image` layer.
Never apply them to `.bookmark`, `.bookmark-display`, or another ancestor,
which would also alter the bookmark name, focus treatment, and other content.

### Data and defaults

Add a serializable `display.visual.image.filters` object. Missing fields in old
bookmarks, imports, or presets resolve to neutral values, so legacy images
remain visually unchanged without rewriting their source URL.

Recommended stored shape:

```json
{
  "display": {
    "visual": {
      "type": "image",
      "image": {
        "url": "",
        "filters": {
          "grayscale": 0,
          "sepia": 0,
          "saturation": 100,
          "brightness": 100,
          "contrast": 100,
          "hueRotation": 0,
          "blur": 0
        }
      }
    }
  }
}
```

| Setting | Neutral value | Allowed range | CSS operation |
| --- | ---: | ---: | --- |
| `grayscale` | 0 | 0–100 | `grayscale(%)` |
| `sepia` | 0 | 0–100 | `sepia(%)` |
| `saturation` | 100 | 0–200 | `saturate(%)` |
| `brightness` | 100 | 50–150 | `brightness(%)` |
| `contrast` | 100 | 50–150 | `contrast(%)` |
| `hueRotation` | 0 | 0–360 | `hue-rotate(deg)` |
| `blur` | 0 | 0–4 px | `blur(px)` |

Use a fixed filter order and numeric bounds. Do not accept arbitrary CSS filter
strings from imported data. Keep the stored URL and image bytes untouched; do
not use canvas processing, uploads, remote services, or additional permissions.
Compose the CSS value in this order: grayscale, sepia, saturation, hue rotation,
brightness, contrast, blur.

### UI and rendering

1. Add a collapsed “Image filters” section to the bookmark visual editor. Show
   it only when the image visual is selected. Provide labeled sliders for the
   settings above and a one-action Reset filters control.
2. Use the existing slider controls, `bookmarkMinMax`, and locale-message
   conventions. The controls must have stable IDs, keyboard support, visible
   focus, and accessible labels/value text.
3. Update `bookmarkDefault` with neutral defaults, and ensure state loading,
   preset creation, copy/apply, and import/export preserve the fields. Do not
   copy filter values to other bookmarks unless the user explicitly chooses an
   image-filter apply action.
4. Set a normalized CSS custom property on the image-visual element and apply
   the filter there. Clear the property when values are neutral so existing
   styles and old saved data keep their current output.
5. Keep the live preview and saved tile on the shared `BookmarkTile` rendering
   path. Define a deterministic interaction with Original, Monochrome, and
   Accent appearance modes. For mask-based Accent assets, either support the
   combination explicitly or disable only incompatible controls with an
   accessible explanation; never silently flatten or rewrite the image.

### Acceptance checks

- A legacy bookmark with an image URL and no filter object renders unchanged.
- Each slider updates the preview immediately, affects only the image pixels,
  and persists after save/reload and export/import.
- Reset returns every filter to its neutral value and removes the CSS filter.
- Values below/above bounds and malformed imported values are clamped or
  replaced with neutral values; no arbitrary CSS reaches the DOM.
- Switching to Letter or Icon hides/disables image-only controls without
  deleting the image URL or filter data.
- Bookmark name, hover/focus colors, image crop, bookmark background, and the
  separate theme-background filters are unaffected.
- Test Original, Monochrome, Accent, transparent logos, photographs, missing
  URLs, and broken URLs in both the editor preview and the final bookmark.
- Confirm the feature works after reload and in development and production
  builds for the supported Firefox and Chromium-based extension targets.

### Test strategy

- Unit-test defaulting, clamping, malformed imported values, and filter-string
  composition using a pure helper.
- Exercise the bookmark editor and saved tile in a real browser: choose an
  image, change each filter, reset, reload, and verify the bookmark name and
  image URL remain intact.
- The repository currently has no `test` script. Add a focused automated test
  command for the pure helper, and keep the browser acceptance steps above as
  integration coverage rather than treating a successful webpack build as a
  substitute for behavior tests.

### Implementation status

Phase 12A is implemented in the bookmark editor and shared bookmark renderer.
Filter defaults and bounds are centralized with the normalization helper, new
and legacy bookmarks are handled safely, and the localized controls update the
preview and persist through the existing bookmark data save/export path. The
focused helper suite runs with `npm test`.

The current main-image visual model does not define Original, Monochrome, or
Accent appearance modes, nor mask-based image assets. Filters therefore apply
directly to the source image layer; mode-specific combinations remain future
work if those appearance modes are introduced.

## Phase 13: Live Preview

All appearance and icon changes must update the existing bookmark preview immediately.

Examples:

- selecting a Lucide icon updates the preview;
- switching Original -> Accent updates the preview;
- enabling global appearance updates the preview;
- changing the theme accent updates Accent-mode previews.

The preview and saved bookmark must share the same renderer.

## Phase 14: Theme Accent Integration

Accent-mode visuals must resolve their color from the current theme.

They should respond correctly to:

- theme changes;
- custom accent changes;
- random accent changes;
- accent cycling, where supported.

Expected behavior:

```text
Theme accent: purple -> orange
            ↓
all visuals using Accent mode update automatically
```

No bookmark data should need to be rewritten for this change.

## Phase 15: Import and Export

Update export data to include the new provider and appearance fields.

The importer must support:

- old nightTab exports;
- new nightTab-extended exports.

An unknown provider should not abort an import.

Preserve the unknown data when practical and display a fallback visual.

## Phase 16: Fallback and Error Handling

A bookmark must still render if an icon or image cannot be resolved.

Possible failures include:

- missing provider;
- removed icon;
- invalid icon ID;
- broken image URL;
- unsupported image format;
- unavailable remote source.

Suggested fallback order:

```text
requested visual
-> saved letter
-> first letter of bookmark name
-> generic link icon
```

Do not show the browser's broken-image indicator.

## Phase 17: Apply-to-All Behavior

Review the current bookmark option copy/apply behavior.

Appearance-related apply operations should copy only the intended visual style values, for example:

- `style.mode`;
- `style.useGlobal`.

Do not accidentally replace every bookmark's selected icon or image URL unless the existing action explicitly includes those fields.

## Phase 18: Accessibility

The icon picker and visual controls must remain keyboard accessible.

Requirements:

- keyboard navigation;
- visible focus;
- accessible labels;
- icon names announced to assistive technology;
- selected state must not be communicated through color alone.

Example:

```html
<button aria-label="Use GitHub icon">
```

## Phase 19: Performance Validation

Test at least:

- 20 bookmarks;
- 100 bookmarks;
- 500 bookmarks;
- many Iconify icons;
- many custom images;
- mixed providers;
- mixed image formats with neutral and non-neutral image filters;
- repeated image-filter slider changes while editing;
- repeated theme accent changes;
- opening the icon picker;
- searching and filtering the icon picker.

The new-tab page must not load the complete searchable icon catalog before it is needed.

Prefer CSS variables and `currentColor` over repeated SVG reconstruction.

## Phase 20: Build and Compatibility Testing

Verify at minimum:

- an old Font Awesome bookmark loads;
- an old image bookmark loads;
- an old nightTab backup imports;
- a Lucide icon saves and reloads;
- a Simple Icons icon saves and reloads;
- an SVG Logos icon saves and reloads;
- Original mode works;
- Monochrome mode works;
- Accent mode works;
- custom image filters apply only to the bookmark image layer;
- neutral defaults preserve old image bookmark appearance;
- invalid filter values cannot inject CSS or break bookmark rendering;
- filter changes persist through save, reload, export, and import;
- the theme accent updates Accent-mode visuals;
- global appearance works;
- per-bookmark override works;
- broken images use a fallback;
- missing icons use a fallback;
- export -> reset -> import preserves the new fields;
- development build works;
- production build works;
- Chrome extension build works;
- Firefox extension build works.

## Recommended Implementation Order

1. Audit the current visual, state, migration, picker, and build code.
2. Add the provider and appearance state model.
3. Add backward-compatible migration behavior.
4. Introduce the shared `VisualRenderer`.
5. Move existing Font Awesome rendering behind the new renderer.
6. Verify legacy behavior before adding new providers.
7. Add Iconify provider infrastructure.
8. Add Lucide.
9. Add Simple Icons.
10. Add SVG Logos.
11. Build the unified picker and search.
12. Add Original, Monochrome, and Accent handling for SVG icons.
13. Add Original and Monochrome handling for custom images.
14. Add per-bookmark image filter data, controls, and live preview updates.
15. Add Accent handling for compatible images with mask/filter fallback.
16. Connect Accent mode to the live theme accent.
17. Add global defaults.
18. Add per-bookmark overrides.
19. Update live preview.
20. Update apply-to-all behavior.
21. Update import/export.
22. Add robust visual fallbacks.
23. Optimize catalog and provider loading.
24. Test web, Chrome, and Firefox builds.

## Definition of Done

The feature is complete when these cases work reliably:

```text
GitHub
Simple Icons
Accent
-> monochrome GitHub mark follows the current nightTab accent
```

```text
Google Drive
SVG Logos
Original
-> official multicolor logo remains unchanged
```

```text
Server
Lucide
Monochrome
-> clean generic server icon follows the normal monochrome icon color
```

```text
Custom transparent logo
Accent
-> image is presented as a consistent accent-colored icon where technically suitable
```

Changing the theme accent must update all Accent-mode visuals without changing their saved source data.

Custom bookmark image filters must update the preview and final bookmark without
changing the source image, and neutral/missing filter settings must preserve
legacy appearance.

Existing nightTab users must not need to recreate bookmarks or manually migrate old backups.
