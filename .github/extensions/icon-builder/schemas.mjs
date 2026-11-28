const text = { type: "string", minLength: 1 };
const id = { ...text, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" };
const object = (properties, required = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
export const inputSchema = {
  oneOf: [
    object({}),
    object({ project: text }, ["project"]),
    object({ assetId: text }, ["assetId"]),
  ],
};
export const actions = [
  {
    name: "list_projects",
    description: "List projects in this worktree.",
    inputSchema: object({}),
  },
  {
    name: "list_assets",
    description: "List assets, optionally filtered by project name.",
    inputSchema: object({ project: text }),
  },
  {
    name: "read_asset",
    description: "Read a registered SVG and the revision required for saving it.",
    inputSchema: object({ id: text }, ["id"]),
  },
  {
    name: "save_asset",
    description: "Replace an SVG if its revision is current and every canvas editor is clean.",
    inputSchema: object({ id: text, svg: text, expectedRevision: text }, [
      "id",
      "svg",
      "expectedRevision",
    ]),
  },
  {
    name: "create_project",
    description: "Create a project with an explicit name and kebab-case directory slug.",
    inputSchema: object({ name: text, slug: id }, ["name", "slug"]),
  },
  {
    name: "create_asset",
    description: "Create and register a new SVG in an existing project without overwriting files.",
    inputSchema: object(
      {
        id,
        project: text,
        label: text,
        svg: text,
        variants: {
          type: "array",
          minItems: 1,
          maxItems: 32,
          items: object(
            {
              size: { type: "integer", minimum: 1, maximum: 4096 },
              theme: { enum: ["light", "dark"] },
            },
            ["size", "theme"],
          ),
        },
      },
      ["id", "project", "label", "svg", "variants"],
    ),
  },
];
