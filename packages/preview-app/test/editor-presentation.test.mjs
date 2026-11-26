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
    const { createElement, createRef, Profiler } = reactModule.default;
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
      if (scenario === "refs") {
        const [{ NumberStepper }, { RangeNumberControl }, { AnchoredPopover }] = await Promise.all([
          import("/packages/ui-components/src/number-stepper.tsx"),
          import("/packages/ui-components/src/range-number-control.tsx"),
          import("/packages/ui-components/src/anchored-popover.tsx"),
        ]);
        const numberRef = createRef();
        const sliderRef = createRef();
        const anchorRef = createRef();
        const firstAnchor = document.createElement("button");
        const nextAnchor = document.createElement("button");
        host.append(firstAnchor, nextAnchor);
        anchorRef.current = firstAnchor;
        let stepperNode = null;
        let replacementNode = null;
        let cleanups = 0;
        const stepperRef = (node) => {
          stepperNode = node;
          return () => {
            stepperNode = null;
            cleanups++;
          };
        };
        const replacementRef = (node) => {
          replacementNode = node;
        };
        const render = (ref) =>
          createElement(
            "div",
            null,
            createElement(NumberStepper, {
              label: "Ref stepper",
              defaultValue: 1,
              inputProps: { ref },
            }),
            createElement(RangeNumberControl, {
              label: "Ref range",
              defaultValue: 25,
              inputProps: { ref: numberRef },
              sliderProps: { ref: sliderRef },
            }),
            createElement(AnchoredPopover, { anchorRef }),
          );
        flushSync(() => root.render(render(stepperRef)));
        const input = container.querySelector(".wm-number-stepper-input");
        const mounted =
          stepperNode === input &&
          numberRef.current === container.querySelector(".wm-range-number-input") &&
          sliderRef.current === container.querySelector(".wm-range-number-slider");
        container.querySelector(".wm-number-stepper button").click();
        container.querySelector(".wm-range-number-control button:last-child").click();
        const values = [input.value, numberRef.current.value, sliderRef.current.value];
        flushSync(() => root.render(render(replacementRef)));
        const replaced = cleanups === 1 && stepperNode === null && replacementNode === input;
        firstAnchor.setAttribute("aria-expanded", "true");
        nextAnchor.setAttribute("aria-expanded", "true");
        anchorRef.current = nextAnchor;
        flushSync(() => root.render(null));
        return {
          mounted,
          values,
          replaced,
          cleared:
            replacementNode === null && numberRef.current === null && sliderRef.current === null,
          anchors: [
            firstAnchor.getAttribute("aria-expanded"),
            nextAnchor.getAttribute("aria-expanded"),
          ],
          failures,
        };
      }
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

test("numeric refs preserve DOM handles and cleanup resets the original popover anchor", async () => {
  assert.deepEqual(await exerciseRoot("refs"), {
    mounted: true,
    values: ["2", "26", "26"],
    replaced: true,
    cleared: true,
    anchors: ["false", "true"],
    failures: [],
  });
});
