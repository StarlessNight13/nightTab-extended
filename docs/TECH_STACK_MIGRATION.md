# Tech Stack Target and Migration Plan

This document records the target technology stack for nightTab Extended and the basic migration path from the current architecture.

The migration must be incremental. Each phase should leave the application usable and should avoid mixing build-system changes, data-model changes, and UI rewrites in one large step.

## Target Stack

| Area | Current | Target |
| --- | --- | --- |
| Language | JavaScript | TypeScript 6 |
| Extension tooling | Webpack 5 | WXT |
| Bundler/dev server | Webpack | Vite 8 / Rolldown through WXT |
| UI | Imperative DOM components | SolidJS |
| State | Shared mutable objects | Solid signals/stores |
| Persistence | Raw localStorage | Typed storage service |
| Runtime validation | Manual checks | Valibot |
| Dates/time | Moment/custom utilities | Native Date and Intl where practical |
| Drag and drop | SortableJS | Keep SortableJS initially |
| Styling | Plain CSS | Modern vanilla CSS |
| Testing | None | Vitest + Testing Library |
| Lint/format | Minimal ESLint | ESLint + Prettier or Oxlint |

## Architecture Direction

The goal is not to turn nightTab into a large SPA with unnecessary abstractions.

Keep:

- the local-first design
- Manifest V3
- SortableJS unless there is a clear reason to replace it
- the existing theme capabilities
- vanilla CSS and runtime CSS variables
- the existing import/export compatibility where possible

Improve:

- type safety
- state ownership
- storage boundaries
- data validation
- test coverage
- browser-extension build tooling
- separation between domain logic and DOM rendering

A likely long-term structure is:

```text
src/
  app/
  components/
  features/
    bookmarks/
    groups/
    search/
    theme/
  stores/
    settings.ts
    bookmarks.ts
  storage/
    storage.ts
    migrations.ts
    import.ts
    export.ts
  schemas/
    settings.ts
    bookmark.ts
  utilities/
```

WXT should own the browser-extension entry points and build process. SolidJS should own the UI as components are migrated.

## Migration Rules

- Do not rewrite the whole application at once.
- Preserve existing user data and import/export behavior.
- Keep a working build after every phase.
- Separate tooling migration from UI migration.
- Add compatibility layers when they reduce migration risk.
- Migrate one feature area at a time.
- Add tests around behavior before replacing complex logic.
- Do not replace working dependencies only for the sake of replacing them.

## Phase 0 - Baseline and Safety

Goal: create a stable reference before architectural changes.

Tasks:

- confirm the current development and production builds work
- document the generated web and extension outputs
- add basic smoke tests for application startup
- capture representative import/export fixtures
- record current storage format and version-migration behavior
- fix or remove the incomplete TypeScript Webpack configuration
- make sure linting runs consistently

Exit condition:

- current behavior can be checked before and after later migrations

## Phase 1 - Replace Webpack with WXT

Goal: modernize the build system without rewriting the application.

Tasks:

- add WXT
- move the new-tab page to a WXT entry point
- reproduce the existing Manifest V3 behavior
- move static asset handling to WXT/Vite
- reproduce locale packaging
- reproduce extension packaging
- keep the existing JavaScript application code running unchanged
- decide how the standalone web/GitHub Pages build shares the application code
- remove Webpack and its build-only dependencies after output parity is confirmed

Exit condition:

- development and production builds use WXT/Vite
- the extension still behaves like the current application
- the standalone web build has a defined path

## Phase 2 - Establish TypeScript

Goal: introduce type safety without changing the UI architecture yet.

Start with data structures instead of DOM-heavy components.

Priority order:

1. application state
2. bookmarks
3. groups
4. theme configuration
5. icon/image configuration
6. persisted storage format
7. utilities
8. remaining components

Tasks:

- add strict TypeScript configuration
- create shared domain types
- convert low-level utilities first
- convert state and storage boundaries
- remove implicit object shapes where practical
- keep JavaScript/TypeScript interoperability during the transition

Exit condition:

- core persisted data and domain models are typed
- new application code should normally be TypeScript

## Phase 3 - Separate Domain Logic from Rendering

Goal: make application behavior independent from direct DOM manipulation.

Current operations such as bookmark and group mutations should become plain typed functions or services.

Examples:

```text
bookmark.item.mod.move()
group.item.mod.add()
data.save()
```

should gradually become explicit domain/storage operations.

Tasks:

- extract bookmark mutations
- extract group mutations
- extract search logic
- extract theme state changes
- isolate persistence from UI feedback and modals
- remove direct rendering responsibilities from the data layer
- add unit tests for extracted logic

Exit condition:

- major business logic can run and be tested without constructing DOM elements

## Phase 4 - Introduce SolidJS Incrementally

Goal: replace the imperative UI without a full rewrite.

Suggested migration order:

1. small shared controls
2. modal
3. simple forms
4. toolbar
5. settings panels
6. bookmark tile
7. group
8. search/header
9. remaining layout and application shell

Tasks:

- add the WXT Solid integration
- establish the Solid application root
- expose existing state through temporary adapters where needed
- replace one UI area at a time
- remove old render/init code only after its replacement is stable
- use Solid stores/signals for reactive state instead of recreating the old global mutable state model

Exit condition:

- the primary application UI is Solid-based
- imperative DOM utilities are limited to cases where they are still useful

## Phase 5 - Storage, Validation, and Migrations

Goal: make persisted user data safer and easier to evolve.

Tasks:

- create a typed storage service
- define Valibot schemas for persisted data
- validate imported backups
- validate loaded persisted state
- move version upgrades into explicit migration functions
- preserve support for existing nightTab data where practical
- add migration fixtures and tests
- keep storage implementation replaceable so browser storage can be adopted later if useful

Exit condition:

- reads, writes, imports, exports, and upgrades pass through typed and validated boundaries

## Phase 6 - Testing and Cleanup

Goal: remove migration scaffolding and establish the new development baseline.

Tasks:

- add Vitest coverage for domain logic
- add Testing Library coverage for important Solid components
- add import/export regression tests
- add migration regression tests
- add a basic extension smoke test
- remove legacy adapters
- remove unused imperative DOM helpers
- remove Moment where native Date/Intl covers the use case
- review SortableJS only after the new UI is stable
- strengthen linting and formatting
- update contributor/development documentation

Exit condition:

- the old architecture is no longer required
- the repository uses the target stack as its normal development model

## Suggested Execution Strategy

Do not treat each phase as one giant pull request.

Prefer small vertical changes such as:

```text
Phase 2
  -> type bookmark models
  -> type group models
  -> type theme models
  -> type storage format

Phase 4
  -> migrate Modal
  -> migrate Toolbar
  -> migrate BookmarkTile
  -> migrate Group
```

Each change should be independently reviewable and should preserve existing behavior unless that change explicitly targets behavior.

## Final Target

```text
WXT
└── Vite 8 / Rolldown
    ├── TypeScript 6
    ├── SolidJS
    ├── Solid Store / signals
    ├── Valibot
    ├── Vitest + Testing Library
    ├── SortableJS
    └── modern vanilla CSS
```

The migration should prioritize maintainability and safe evolution over completing the stack change as quickly as possible.
