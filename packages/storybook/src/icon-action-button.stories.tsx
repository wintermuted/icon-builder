import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconActionButton } from "@wm-asset-workflows/ui-components";

const meta = {
  id: "shared-iconactionbutton",
  title: "Shared/Controls/IconActionButton",
  component: IconActionButton,
  parameters: {
    docs: {
      description: {
        component:
          "Icon Builder's Lucide-name and accessible-label adapter around the central Button. Native button attributes and refs pass through.",
      },
    },
  },
  args: { icon: "Pencil", label: "Rename item" },
} satisfies Meta<typeof IconActionButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
