import type { Meta, StoryObj } from "@storybook/react-vite";
import { ActionGroup } from "@wm-asset-workflows/ui-components";

const meta = {
  title: "Shared/ActionGroup",
  component: ActionGroup,
  args: {
    children: (
      <>
        <button type="button" className="btn btn-primary btn-sm">
          Save changes
        </button>
        <button type="button" className="btn btn-sm">
          Cancel
        </button>
      </>
    ),
  },
  argTypes: { children: { control: false } },
} satisfies Meta<typeof ActionGroup>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Start: Story = {};
export const End: Story = { args: { justify: "flex-end", gap: "1rem" } };
