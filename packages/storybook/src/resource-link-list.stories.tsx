import type { Meta, StoryObj } from "@storybook/react-vite";
import { ResourceLinkList } from "@wm-asset-workflows/ui-components";

const meta = {
  title: "Shared/ResourceLinkList",
  component: ResourceLinkList,
  args: {
    items: [
      {
        href: "https://github.com/wintermuted/icon-builder",
        label: "Project source",
        external: true,
      },
      {
        href: "https://wintermuted.github.io/icon-builder/preview/",
        label: "Asset preview",
        external: true,
      },
    ],
  },
} satisfies Meta<typeof ResourceLinkList>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Documentation: Story = {};
export const Internal: Story = {
  args: {
    items: [
      { href: "#project/Marks", label: "Marks", metadata: <small> · 4 icons</small> },
      { href: "#project/Symbols", label: "Symbols", metadata: <small> · 2 icons</small> },
    ],
  },
};
