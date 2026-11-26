import type { Meta, StoryObj } from "@storybook/react-vite";
import { EmptyState } from "@wm-asset-workflows/ui-components";

const meta = {
  title: "Shared/EmptyState",
  component: EmptyState,
  args: {
    heading: "No assets yet",
    icon: "ImagePlus",
    children: <p>Add the first editable SVG to this project.</p>,
    action: (
      <a href="#add-asset" className="btn btn-primary btn-sm">
        Add first asset
      </a>
    ),
  },
  argTypes: {
    heading: { control: "text" },
    icon: { control: false },
    children: { control: false },
    action: { control: false },
  },
} satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;
export const FirstAsset: Story = {};
export const Compact: Story = {
  args: {
    compact: true,
    heading: undefined,
    icon: undefined,
    action: undefined,
    children: "No source assigned.",
  },
};
