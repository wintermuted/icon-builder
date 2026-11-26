import type { Meta, StoryObj } from "@storybook/react-vite";
import mermaid from "mermaid";
import { Diagram } from "@wm-asset-workflows/ui-components";

const meta = {
  id: "shared-diagram",
  title: "Shared/Display/Diagram",
  component: Diagram,
  args: {
    id: "storybook-diagram",
    code: "flowchart LR\n  SVG[SVG source] --> Preview --> Export[PNG export]",
    theme: "light",
    renderer: mermaid,
  },
  argTypes: {
    renderer: { control: false },
    id: { control: false },
    theme: { control: false },
  },
  render: (args, context) => (
    <Diagram {...args} id={`diagram-${context.id}`} theme={context.globals.theme} />
  ),
} satisfies Meta<typeof Diagram>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Workflow: Story = {};
export const InvalidSource: Story = { args: { code: "not valid Mermaid syntax" } };
