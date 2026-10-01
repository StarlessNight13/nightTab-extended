# NightlyTab

NightlyTab is a customizable browser new-tab page for bookmarks, layouts, themes, and backgrounds.

> **Fork notice:** NightlyTab is an independent, unofficial fork of [nightTab by zombieFox](https://github.com/zombieFox/nightTab). This project is not affiliated with or endorsed by the upstream project. The NightlyTab fork identity and release metadata were prepared on 2026-10-01; see the repository history for the dates and details of code changes.

The source and this fork's modifications are distributed under **GNU GPL-3.0-only**. See [LICENSE](license) and [NOTICE.md](NOTICE.md). NightlyTab is provided without warranty under the license terms.

## Features

- A new-tab page with bookmark groups, layouts, clock, date, and search.
- Custom themes, fonts, colors, and image or video backgrounds.
- Local background-image uploads, bookmark visuals, and backup/restore.
- Settings and backups remain in the browser unless you choose to export or search using an external provider.

## Build and local installation

Requirements: Node.js and npm.

```sh
npm ci
npm run build
```

The build creates a development-ready extension directory at `dist/web/` and a store-package ZIP at `dist/extension/`.

- **Chrome and Chromium browsers:** open the browser's extensions page, enable developer mode, and load `dist/web/` as an unpacked extension.
- **Firefox:** the manifest includes a dedicated Gecko add-on ID for a future signed release. For development, load the extension from `about:debugging`.

Store listings are not published yet. Draft listing and release notes are in [docs/STORE_LISTING.md](docs/STORE_LISTING.md).

## Privacy

See [PRIVACY.md](PRIVACY.md). NightlyTab stores its settings and bookmarks locally. Search terms go to the search engine you select when you submit a search. Fonts and remote background/bookmark images may be requested from their respective hosts.

## Upstream documentation and assets

Some existing help pages remain hosted by the upstream nightTab project. The in-app Support links identify those pages as upstream documentation. Preset backgrounds use NightlyTab's built-in theme colors instead of remotely hosted images or videos. An unrelated easter-egg GIF still loads from the upstream `nightTabAssets` repository; review its reuse rights or remove it before the first public release.

## License and source

NightlyTab is a modified GPL-3.0-only work. The complete source, build configuration, and build instructions are in this repository. Store releases should link to the corresponding tagged source revision. Third-party license notices are included in the extension package where available.
