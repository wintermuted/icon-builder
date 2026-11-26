import type { Meta, StoryObj } from "@storybook/react-vite";
import { CodeBlock } from "@wm-asset-workflows/ui-components";

const meta = {
  id: "shared-codeblock",
  title: "Shared/Display/CodeBlock",
  component: CodeBlock,
  args: {
    children:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">\n  <rect x="20" y="20" width="200" height="200" fill="#6b5cff" />\n</svg>',
    style: { width: 320, maxWidth: "100%" },
  },
} satisfies Meta<typeof CodeBlock>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Wrapped: Story = {};
export const HorizontalScroll: Story = { args: { wrap: false } };
