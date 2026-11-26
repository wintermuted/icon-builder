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
Shared icons, collapsible editor sidebars, the preview error boundary, and Mermaid
diagrams live in `@wm-asset-workflows/ui-components`. Import them from the package
entrypoint; Vite consumes its TSX source directly without a separate library build.
Diagram components receive their data and Mermaid renderer through props rather
than accessing application state or browser globals. Consumers provide the
existing `preview/styles.css` classes; the package does not import app styles.
The entrypoint composes modules under `packages/preview-app/src/`:
`svg/` owns cached SVG documents and edits, `canvas/` owns gestures and cleanup,
`editor/` owns layer panels, and `project/` and `views/` own project data and DOM
rendering. Mutable state has a single owner; collaborators receive explicit
dependencies and view refresh callbacks rather than importing the entrypoint.

CI verifies the 500/501-line JS/TS/TSX boundary and browser editing against Vite's
production output, served under a nested PR-preview prefix. Local browser
regressions use Vite's dev middleware without running a build. They use a
deterministic SVG/manifest fixture, real React/Lucide, and a Mermaid stub (diagram
rendering is not the subject of these editing tests). A separate integration test
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

### Dependency and Compiler Upgrades

The preview app owns `@wintermuted/ui-theme`, `lucide`, React, React DOM, Vite,
its React plugin, and React typings in `packages/preview-app/package.json`.
The `ui-components` workspace owns Lucide React and declares React as a peer
dependency so consumers share their React runtime. npm may hoist or nest workspace dependencies;
the dependency check resolves Vite from the owning package rather than assuming
a root-level binary. The theme is bundled by Vite and the SVG editor uses the
existing Lucide DOM adapter.

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
