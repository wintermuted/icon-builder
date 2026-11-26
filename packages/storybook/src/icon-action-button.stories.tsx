import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconActionButton } from "@wm-asset-workflows/ui-components";

const meta = {
  title: "Shared/IconActionButton",
  component: IconActionButton,
  args: { icon: "Pencil", label: "Rename item" },
} satisfies Meta<typeof IconActionButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
