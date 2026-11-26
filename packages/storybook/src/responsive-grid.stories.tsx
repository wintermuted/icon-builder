import type { Meta, StoryObj } from "@storybook/react-vite";
import { ResponsiveGrid } from "@wm-asset-workflows/ui-components";

const meta = {
  title: "Shared/ResponsiveGrid",
  component: ResponsiveGrid,
  args: {
    minItemWidth: "180px",
    gap: "12px",
    children: Array.from({ length: 4 }, (_, index) => (
      <article key={index} style={{ padding: "1rem", border: "1px solid var(--wm-color-border)" }}>
        Asset {index + 1}
      </article>
    )),
  },
  argTypes: {
    children: { control: false },
    mode: { control: "select", options: ["auto-fit", "auto-fill"] },
  },
} satisfies Meta<typeof ResponsiveGrid>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Fit: Story = {};
export const Fill: Story = { args: { mode: "auto-fill" } };
