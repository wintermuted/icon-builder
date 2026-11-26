import type { Meta, StoryObj } from "@storybook/react-vite";
import { EditorSidebar } from "@wm-asset-workflows/ui-components";

const meta = {
  id: "shared-editorsidebar",
  title: "Shared/Layout/EditorSidebar",
  component: EditorSidebar,
  args: { side: "left", label: "Asset analysis", children: null },
  argTypes: {
    side: { control: "inline-radio", options: ["left", "right"] },
    children: { control: false },
    storageKey: { control: false },
  },
  render: (args) => (
    <div style={{ maxWidth: 360 }}>
      <EditorSidebar {...args} storageKey={`wm-storybook-${args.side}-sidebar-collapsed`}>
        <div className="card-body">
          <h4>Asset palette</h4>
          <p>Collapse or expand this panel. Storybook preferences are separate from the app.</p>
          <button className="btn btn-sm" type="button">
            Add color
          </button>
        </div>
      </EditorSidebar>
    </div>
  ),
} satisfies Meta<typeof EditorSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Analysis: Story = {};
export const Elements: Story = { args: { side: "right", label: "Element editor" } };
