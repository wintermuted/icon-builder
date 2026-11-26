import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, test } from "node:test";
import { chromium } from "playwright";
import { startPreviewTestServer } from "./preview-test-server.mjs";

let server, browser, page;
before(async () => {
  // Source-unit coverage complements the production-bundle editor regressions.
  server = await startPreviewTestServer();
  try {
    browser = await chromium.launch();
  } catch (error) {
    await server.close();
    throw error;
  }
});
after(async () => {
  await browser?.close();
  await server?.close();
});
beforeEach(async () => {
  page = await browser.newPage();
  await page.route("https://cdn.jsdelivr.net/**", (route) =>
    route.fulfill({
      body: "window.mermaid = { initialize() {}, async render() { return { svg: '<svg></svg>' }; } };",
      contentType: "text/javascript",
    }),
  );
  await page.goto(`${server.url}/preview/index.html#asset/fixture`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "Edit source size", exact: true }).waitFor();
});
afterEach(async () => page?.close());

async function exerciseRoot(scenario) {
  return page.evaluate(async (scenario) => {
    const resources = performance.getEntriesByType("resource").map((entry) => entry.name);
    const load = (pattern) => {
      const url = resources.find((url) => pattern.test(new URL(url).pathname));
      if (!url) throw new Error(`Missing loaded React module: ${pattern}`);
      return import(url);
    };
    const [reactModule, clientModule, domModule] = await Promise.all([
      load(/\/react\.js$/),
      load(/\/react[-_]dom[-_]client\.js$/),
      load(/\/react[-_]dom\.js$/),
    ]);
    const { createElement, Profiler } = reactModule.default;
    const { createRoot } = clientModule.default;
    const { flushSync } = domModule.default;
    const container = document.createElement("div");
    const host = document.createElement("div");
    document.body.append(container, host);
    const failures = [];
    const root = createRoot(container, {
      onUncaughtError: (error) =>
        failures.push({
          message: error.message,
          rangeError: error instanceof RangeError,
        }),
    });
    try {
      if (scenario === "controlled") {
        const { SplitButton } = await import("/packages/ui-components/src/split-button.tsx");
        const props = { value: "circle", actionLabel: "Add", menuLabel: "Choose" };
        flushSync(() =>
          root.render(
            createElement(SplitButton, {
              ...props,
              options: [{ value: "circle", label: "Circle" }],
            }),
          ),
        );
        flushSync(() => root.render(createElement(SplitButton, { ...props, options: [] })));
        return failures;
      }
      const { EditorPresentation, EditorPortals } =
        await import("/packages/preview-app/src/editor/presentation.tsx");
      const presentation = new EditorPresentation();
      let commits = 0;
      flushSync(() =>
        root.render(
          createElement(
            Profiler,
            {
              id: "portals",
              onRender: () => commits++,
            },
            createElement(EditorPortals, { presentation }),
          ),
        ),
      );
      const results = [];
      for (const count of [64, 256]) {
        presentation.clear();
        commits = 0;
        let notifications = 0;
        let initialized = 0;
        const unsubscribe = presentation.subscribe(() => notifications++);
        presentation.batch(() => {
          for (let index = 0; index < count; index++) {
            presentation.mount(host, createElement("button", { key: index }, String(index)));
            presentation.afterMount(() => {
              if (host.children.length !== count)
                throw new Error("Controller initialized before the complete batch mounted.");
              initialized++;
            });
          }
        });
        results.push({ count, commits, notifications, initialized, mounted: host.children.length });
        unsubscribe();
      }
      presentation.clear();
      let rolledBackInitializer = false;
      try {
        presentation.batch(() => {
          presentation.mount(host, "Discarded");
          presentation.afterMount(() => {
            rolledBackInitializer = true;
          });
          throw new Error("Registration failed");
        });
      } catch (error) {
        if (error.message !== "Registration failed") throw error;
      }
      const rolledBack = presentation.getSnapshot().length === 0 && !rolledBackInitializer;
      presentation.dispose();
      return { results, rolledBack, failures };
    } finally {
      flushSync(() => root.unmount());
      container.remove();
      host.remove();
    }
  }, scenario);
}

test("portal registration takes one React commit per batch and initializes complete DOM", async () => {
  const result = await exerciseRoot("batch");
  assert.deepEqual(
    result.results,
    [64, 256].map((count) => ({
      count,
      commits: 1,
      notifications: 1,
      initialized: count,
      mounted: count,
    })),
  );
  assert.equal(result.rolledBack, true);
  assert.deepEqual(result.failures, []);
});

test("an invalid explicit controlled SplitButton value remains an error", async () => {
  assert.deepEqual(await exerciseRoot("controlled"), [
    {
      message: "Unknown SplitButton option: circle",
      rangeError: true,
    },
  ]);
});
