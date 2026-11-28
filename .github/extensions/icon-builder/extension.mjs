import { joinSession, createCanvas, CanvasError } from "@microsoft/copilot-sdk/extension";
import { CanvasProvider } from "./provider.mjs";
import { actions, inputSchema } from "./schemas.mjs";

const provider = new CanvasProvider(new URL("../../../", import.meta.url));
const invoke = async (method, input) => {
  try {
    return await provider.request(method, input);
  } catch (error) {
    throw new CanvasError(error.code || "icon_builder_error", error.message);
  }
};

await joinSession({
  canvases: {
    definitions: [
      createCanvas({
        id: "icon-builder",
        displayName: "Icon Builder",
        description: "Browse, create, and edit this worktree's SVG projects and assets.",
        inputSchema,
        actions: actions.map((action) => ({
          ...action,
          handler: (ctx) => invoke(action.name, ctx.input ?? {}),
        })),
        open: async (ctx) => {
          const result = await invoke("open", { instanceId: ctx.instanceId, ...ctx.input });
          return { title: "Icon Builder", url: result.url };
        },
        onClose: async (ctx) => {
          await invoke("close", { instanceId: ctx.instanceId });
        },
      }),
    ],
  },
});
