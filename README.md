# Agentic Icon Builder

Agentic workflow app for building SVG logos and glyphs, authoring markdown-driven Mermaid diagrams, generating deterministic PNGs, and capturing browser screenshots.

## Goals

- Keep SVG assets as source of truth.
- Support markdown-driven diagrams in a previewable lane.
- Generate deterministic PNG outputs.
- Capture live browser previews for review artifacts.
- Operate smoothly from VS Code Copilot Chat.

## Repository Layout

```
assets/svg/          SVG source files — source of truth, never overwritten by scripts
specs/               Markdown specs with Mermaid blocks for the diagram lane
manifests/assets.json  Asset catalog consumed by preview and generator scripts
packages/            Nx-managed TypeScript package boundaries
packages/preview-app/ TypeScript browser application source
packages/ui-components/ Reusable React components consumed by the preview app
packages/storybook/  Shared component catalog published alongside the app
packages/preview-server/ TypeScript preview HTTP server
packages/workflows/  TypeScript workflow CLIs and shared paths
packages/image-generation/ TypeScript CLI around deterministic Pillow generators
preview/             Static browser output and preview assets
scripts/node/        CLI compatibility entrypoints for package workflows/server
scripts/python/      Python compatibility entrypoints for image generation
outputs/png/         Generated PNG assets (git-ignored except .gitkeep)
outputs/screenshots/ Browser capture outputs (git-ignored except .gitkeep)
```

## Prerequisites

- Node.js 26.13.1+ (Node 26 LTS)
- Python 3.11+ (available as `python3` on `PATH`)
- Playwright Chromium (one-time install)

```bash
npm run install:deps              # Uses the environment's internal registry when configured
python3 -m pip install -r requirements.txt
npx playwright install chromium   # one-time browser install
```

## Commands

```bash
npm run build:specs     # Parse specs/*.md Mermaid blocks → preview/spec-index.json
npm run preview         # Start Vite with React Fast Refresh and the existing preview APIs
npm run storybook       # Open the shared component catalog at http://localhost:6006
npm run build:storybook # Build the static catalog (CI) to dist/storybook/
npm run generate:png    # Generate deterministic PNG assets via Pillow
npm run capture         # Capture light/dark screenshots using Playwright
npm run workflow:logo   # Run build:specs + generate:png + capture in sequence
npm run graph           # Explore the Nx project and task graph
npm run build           # Build every package through Nx
npm run typecheck       # Check package types with native TypeScript 7
npm run test:toolchain  # Verify native CLI and Nx compiler API compatibility
npm run test:preview    # Exercise React editing/navigation and Vite APIs without a build
npm run test:file-size  # Verify Oxlint's exact boundary (CI; invokes the linter)
npm run lint            # Lint JavaScript/TypeScript with Oxlint
npm run lint:fix        # Apply safe Oxlint fixes
npm run format          # Format supported source/config/docs with Oxfmt
npm run format:check    # Check formatting without writing files
```

Oxlint and Oxfmt are root development tools configured by `.oxlintrc.json`
and `.oxfmtrc.json`. Generated bundles, build outputs, and captures are excluded;
Oxfmt also leaves the npm-managed lockfile and `manifests/assets.json` untouched.
The preview server writes the manifest using two-space `JSON.stringify` formatting.
The Code quality workflow
runs both checks on pull requests and pushes to `main`, including docs-only changes.

### Source file length

Oxlint enforces **at most 500 lines per authored JavaScript/TypeScript file**,
including blank lines and comments. Keep modules comfortably below the cap after
formatting; do not add file overrides or inline disables. This applies to source,
scripts, declarations, and tests, not CSS, HTML, JSON, Python, SVG, or Markdown.
Vite's generated output under `dist/preview-app/` remains excluded.

The React entrypoint is `packages/preview-app/src/main.tsx`; TSX components under
`ui/` render the shell, project collection, project/source pages, dialogs, and editor
scaffold. The SVG editor retains imperative controllers for the mutable SVG
document and its element controls, mounted and cleaned up by `AssetPage`.
Shared components live in `@wm-asset-workflows/ui-components`: icons, icon action
buttons, inline rename forms, toasts, dialogs, file dropzones, prompt carousels,
preview cards, collapsible editor sidebars, the preview error boundary, and Mermaid
diagrams. Import them from the package entrypoint; Vite consumes its TSX source
directly without a separate library build.
The package also exports `PageHeader`, `ResponsiveGrid`, `SplitLayout`,
`ActionGroup`, `FormField`, `StatusMessage`, `EmptyState`, `ResourceLinkList`,
`ToggleButton`, and `AppFrame`. Headers and frames compose caller-owned content;
grids accept item widths/gaps and auto-fit/auto-fill modes. Split layouts retain
caller-provided pane wrappers and collapse at 680px (`compact`), 720px (`medium`),
or below 900px (`wide`).
`FormField` associates its input/select/textarea with labels, hints, and errors
without taking over its value or ref. `ToggleButton` is controlled and can forward
native button refs; omit `onPressedChange` when an existing DOM controller owns it.
`ActionGroup` does not impose toolbar semantics. `StatusMessage` defaults to polite
live text without a status role; error messages use alerts. Resource links receive
prepared URLs and secure new-tab attributes, not application routing logic.
Diagram components receive their data and Mermaid renderer through props rather
than accessing application state or browser globals. API calls, routing, project
prompt preparation, uploads, and the toast event adapter remain in `preview-app`.
`InlineRename` is controlled by its caller; `FileDropzone` emits selected files;
`PreviewCard` composes header, preview, title, body, and footer slots without an
application asset model. `Dialog` owns focus trapping/restoration and dismissal.
`Toast` optionally auto-dismisses through `onDismiss`; change `resetKey` to restart
its timer when repeating the same message. `PromptCarousel` handles navigation and
clipboard feedback; its optional `idPrefix` preserves application DOM hooks.

### Shared control adoption

`IconActionButton` and `ToggleButton` are product adapters around the published
`@wintermuted/ui-react` Button. They retain the local Lucide mapping, accessible
names, native attributes/refs, cancelled-click handling, and imperative editor
hooks. `Toast` composes the central controlled Toast while retaining the local
duration/resetKey timer and top-of-page placement. It also exposes the central
accessible dismiss action. Their local stories describe these adapter contracts;
canonical primitive APIs and generic stories remain in Wintermuted UI.

The manifests and lockfile pin official React `1.3.0` and theme `1.0.4` GitHub
release tarballs because the configured registry did not provide these versions.
The root theme override keeps the central React dependency and both local
catalog/app consumers on the same stylesheet release. These are compiled package
exports, not central repository source imports.

`Dialog` composes the published native Dialog using `titleId` and `closeAction`.
The product adapter retains conditional mounting, caller-selected initial focus,
backdrop dismissal, X close action and modal sizing; the central component owns
keyboard trapping and focus restoration. `FormField` composes FieldGroup's
label/control associations and simultaneous hint/error descriptions, with explicit
`hintId`/`errorId` support. Its adapter retains required markers, inline layout,
existing descriptions and error alert semantics. Their product stories remain.
`StatusMessage` stays a
paragraph with explicit live-region urgency: central Alert's div/status default
is not an equivalent replacement. No duplicate generic feedback is introduced.

The native editable `NumberStepper`, domain controllers/portals, routing, layouts,
and headers are not part of this adoption. Run the focused adapter browser checks
without a production build:

```powershell
node --test packages\preview-app\test\control-adapters.test.mjs
```

`NumberStepper` supports controlled values or native uncontrolled inputs, forwards
input refs/handlers, and bounds button increments with fractional steps.
`PropertyList` renders semantic definition lists with caller-owned value controls.
`EditableValue` composes a label, compact code value, and edit action; its caller
owns editing and persistence. `PreviewSurface` contains images with configurable
height and width. `CodeBlock` preserves text and optionally wraps long lines;
clipboard actions remain separate. The app's imperative SVG controllers mount
shared React presentation through route-owned portals, retaining their native
controls and cleaning up presentation on refresh or navigation. Each loaded
editor region batches portal registration into one commit; controller DOM
initialization runs after all controls in that batch are mounted.

`RangeNumberControl` coordinates a range slider, numeric input, and bounded
increment/decrement actions. It supports controlled values or forwarded native
input refs for existing controllers. `ReorderControls` emits directional actions
with caller-owned boundary rules. `SelectableListItem` is a semantic list item
with independent active, selected, marked, and drag states; callers provide its
selection controls and drag handlers.
`AnchoredPopover` uses the native popover lifecycle, clamps to its `anchorRef`
and viewport, and repositions on scrolling, resizing, or content changes.
Give it an accessible name and connect its ID to the trigger's `popoverTarget`
or existing native controller. `SplitButton` separates option selection from its
primary action, supports controlled/default selections, and handles keyboard
navigation, Escape, outside clicks, and disabled/empty choices. These components
do not interpret SVG shapes, reorder models, or persist edits.
If an uncontrolled SplitButton selection is removed, it resets to the first
remaining option or the empty state. An unknown explicit controlled value remains
an error.

React is a peer dependency; `@wintermuted/ui-theme` is a direct dependency of
`ui-components`. Consumers load the global theme once, followed by the package
stylesheet:

```tsx
import "@wintermuted/ui-theme/index.css";
import "@wm-asset-workflows/ui-components/styles.css";
```

The extracted controls and layout primitives own their styles in the package. Existing
sidebar, diagram, and error-boundary layouts still use `preview/styles.css`;
the shared package does not import that app stylesheet.
If the Mermaid CDN is unavailable, navigation and editing remain usable; only
nonempty diagram sections show an unavailable-renderer alert.
The entrypoint composes modules under `packages/preview-app/src/`:
`svg/` owns cached SVG documents and edits, `canvas/` owns gestures and cleanup,
`editor/` owns layer panels, and `project/` and `views/` own project data and DOM
rendering. Mutable state has a single owner; collaborators receive explicit
dependencies and view refresh callbacks rather than importing the entrypoint.

CI verifies the 500/501-line JS/TS/TSX boundary and browser editing against Vite's
production output, served under a nested PR-preview prefix. Local browser
regressions use Vite's dev middleware without running a build. They use a
deterministic SVG/manifest fixture, real React/Lucide, and a Mermaid stub (diagram
rendering is not the subject of these editing tests). Test files run sequentially
to keep their Vite middleware servers from competing for a WebSocket port.
A separate integration test
exercises the real Vite configuration, repository data, and backend API.
Chromium must already be installed.

### React and Vite preview

`npm run preview` serves `http://localhost:4178/preview/index.html`. Vite compiles
TSX on demand and provides React Fast Refresh; the dev plugin preserves the existing
`/~asset`, project, and steering-source APIs without a second server or port.
It builds the diagram index on startup and refreshes it when specs change.
Canonical SVG/manifest changes refresh the page, while successful API writes
retain the existing short reload-suppression window.

`preview/index.html` is a thin Vite entry; application CSS and the theme are imported
by `main.tsx`. `preview/styles.css` remains the authored application stylesheet.
`preview-app:build` writes HTML and hashed JS/CSS to `dist/preview-app/`.
Its Nx cache includes the external preview HTML, stylesheet, and favicon source.
`preview-server:serve` builds that app output and the spec index before serving
the production bundle. The compatibility `scripts/node/build-spec-index.mjs`
entrypoint explicitly rebuilds the index using the compiled workflows package.
Relative asset URLs support both the Pages root and nested PR previews.
Pages copies that output alongside canonical SVGs, the manifest, and the spec index;
the capture workflow serves it through the backend's `--built` mode.
Pages artifacts are named per workflow run attempt, and deployment waits for API
visibility so reruns cannot collide with an earlier attempt's artifact.
Project color analysis retains valid SVG colors when another asset fails and
reports the unavailable assets instead of hiding all results.

### Storybook publishing

The catalog groups 32 shared components by type: Layout, Controls, Display,
Overlays, and Feedback, with controls, generated API docs, and a Light/Dark toolbar.
Explicit CSF IDs preserve existing story and Docs URLs when categories change.
Stories load the theme, shared component styles,
and the remaining app layout stylesheet,
not its entrypoint or backend. Mermaid is bundled so diagram examples work
without a CDN. Sidebar stories use separate storage keys to avoid changing
the app's persisted sidebar preferences.

Storybook is published at `https://wintermuted.github.io/icon-builder/storybook/`
alongside the app at `/icon-builder/preview/`. PR deployments include both at
`/icon-builder/previews/pr-<number>/preview/` and
`/icon-builder/previews/pr-<number>/storybook/`; preview comments link to both.
The existing Pages workflow builds and typechecks the workspace, stages
`dist/storybook/` into the same artifact, and health-checks both surfaces.
CI also renders the staged catalog at production and nested PR prefixes before
deployment, including all 73 stories, 32 generated Docs pages, and interactive
checks for the extracted controls and layout primitives.
Closing a PR removes its entire preview directory, including Storybook.

Vite uses relative asset URLs and an isolated Storybook configuration, so the
same static catalog works at production and nested PR paths. Add stories under
`packages/storybook/src/`; source output stays ignored under `dist/`.

### Dependency and Compiler Upgrades

The preview app owns `@wintermuted/ui-theme`, `lucide`, React, React DOM, Vite,
its React plugin, and React typings in `packages/preview-app/package.json`.
The `ui-components` workspace owns Lucide React and the Wintermuted theme as direct
dependencies, and declares React as a peer dependency so consumers share their
runtime. npm may hoist or nest workspace dependencies;
the dependency check resolves Vite from the owning package rather than assuming
a root-level binary. The theme is bundled by Vite and the SVG editor uses the
existing Lucide DOM adapter.
Startup also checks resolution of the UI workspace package so existing installs
automatically restore its link after updating the checkout.

Nx and `@nx/js` are kept at the same stable version. If `nx migrate` cannot
retrieve provenance metadata from the configured registry, update the package
versions together and regenerate the lockfile, then perform a clean install:

```bash
npm run install:deps -- --package-lock-only --ignore-scripts --include=dev
npm ci
```

Review the intervening Nx migration requirements manually; do not disable
provenance or TLS checks. CI runs compiler checks and builds.

TypeScript uses the documented dual-compiler layout: `@typescript/native`
aliases TypeScript 7 and provides `tsc` for typechecking, while `typescript`
aliases `@typescript/typescript6` and supplies the compiler API required by
`@nx/js:tsc` builds. Its fallback CLI is `tsc6`.

The theme is updated to `0.21.5`, the latest version currently available from
the configured registry. The producer's `1.0.3` release is not available there;
adopting it remains pending registry availability. Browser Lucide is pinned to
the same version as the npm dependency, and Mermaid is pinned to a stable version.

## GitHub Copilot App

The app configuration lives in `.github/github-app.yml`. Review and accept it
in the app before using the repository scripts.

- **Setup** runs on session creation and can also be rerun manually. It installs
  npm dependencies using the existing registry-aware installer, Pillow using
  `python3 -m pip`, and Playwright Chromium. Node.js and Python must already be
  installed, with Python available as `python3` on `PATH` to match PNG generation.
- **Preview** starts the existing preview workflow. The app detects its ready
  message and opens `/preview/index.html` in the integrated browser.
- **Generate PNGs**, **Capture screenshots**, and **Full logo workflow** run the
  existing export commands on demand.

The preview uses port 4178 by default; stop another session's preview before
starting this one on the same port. No archive cleanup script is configured,
so archiving does not run any repository-defined file deletion.

## Prompt-Driven Authoring

Logos and glyphs are designed to be created primarily through VS Code Copilot Chat. Use the provided prompt file to start an interactive session:

```
/create-svg-asset
```

The agent will interview you for the design intent, generate the SVG, register it in the manifest, and run the pipeline. See [docs/prompt-driven-authoring.md](docs/prompt-driven-authoring.md) for example prompts and SVG conventions.

## Usage Guide

### Adding a New Logo or Glyph (Manual)

1. Author the SVG in `assets/svg/<id>.svg`. Keep it minimal and editable — no baked raster artifacts.
2. Register it in `manifests/assets.json`:

   ```json
   {
     "assets": [
       {
         "id": "my-glyph",
         "label": "My Glyph",
         "source": "assets/svg/my-glyph.svg",
         "variants": [
           { "size": 64, "theme": "dark" },
           { "size": 64, "theme": "light" }
         ]
       }
     ]
   }
   ```

3. Run `npm run preview`.
4. Inspect the logo tile in the browser at `http://localhost:4178/preview/index.html`.
5. Run `npm run generate:png` to produce `outputs/png/logo-sheet.png`.
6. Run `npm run capture` to produce `outputs/screenshots/preview-light.png` and `preview-dark.png`.

### Adding a Mermaid Diagram Spec

1. Create or edit a markdown file in `specs/`, e.g. `specs/my-system.md`.
2. Add a Mermaid fenced block:

   ````markdown
   ```mermaid
   flowchart LR
     A[Input] --> B[Process] --> C[Output]
   ```
   ````

3. Run `npm run build:specs` to update `preview/spec-index.json`.
4. Refresh the preview at `http://localhost:4178/preview/index.html` — the diagram appears in the Markdown Diagram Specs panel.

### Running the Full Workflow

```bash
npm run workflow:logo
```

This runs `build:specs → generate:png → capture` in sequence. Use it after any authoring change to produce fresh outputs.

### Theme Toggle and Capture

The preview supports a `?theme=light` or `?theme=dark` query param for deterministic capture. Click **Toggle Theme** in the header or append `?theme=dark` to the URL manually. The capture script automatically captures both variants.

### Serving the Preview

```bash
npm run preview
# → http://localhost:4178/preview/index.html
```

To use a different port:

```bash
npm run dev --workspace @wm-asset-workflows/preview-app -- --port 5000
```

To stop Vite, press Ctrl+C in the terminal running the preview.

## Notes

- SVG sources in `assets/svg/` are the canonical source of truth — scripts never overwrite them.
- Mermaid blocks are for flow/architecture diagrams, not brand mark construction.
- `outputs/` is treated as generated content — do not commit generated PNGs unless intentional.
- `preview/spec-index.json` is also git-ignored (it is rebuilt from `specs/` on demand).

## Nx Workspace

The npm workspace is orchestrated by Nx. Each package has a `project.json` with independently cacheable targets, while the existing root commands remain stable:

- `packages/preview-app/` serves React TSX with Vite and builds to `dist/preview-app/`.
- `packages/preview-server/` compiles the TypeScript preview HTTP server to `dist/packages/preview-server/`.
- `packages/workflows/` compiles the spec indexing and screenshot capture CLIs.
- `packages/image-generation/` exposes a TypeScript CLI and keeps Pillow scripts as the rendering implementation.

Use `npx nx show projects` to list projects, `npx nx show project <name>` to inspect targets, and `npx nx run <project>:<target>` to run one package task.
