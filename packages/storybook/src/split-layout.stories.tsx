import type { Meta, StoryObj } from "@storybook/react-vite";
import { SplitLayout } from "@wm-asset-workflows/ui-components";

const meta = {
  id: "shared-splitlayout",
  title: "Shared/Layout/SplitLayout",
  component: SplitLayout,
  args: {
    children: [
      <section key="primary">
        <h4>Primary content</h4>
        <p>Assets or editable preview.</p>
      </section>,
      <aside key="secondary">
        <h4>Supporting content</h4>
        <p>References and guidance.</p>
      </aside>,
    ],
  },
  argTypes: {
    children: { control: false },
    collapseAt: { control: "select", options: ["compact", "medium", "wide"] },
  },
} satisfies Meta<typeof SplitLayout>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Balanced: Story = {};
export const Guidance: Story = {
  args: { primarySize: "1.5fr", secondaryMinWidth: "190px", collapseAt: "compact" },
};
export const Workspace: Story = {
  args: { primarySize: "0.9fr", secondarySize: "1.1fr", collapseAt: "wide", stackGap: "0" },
};
