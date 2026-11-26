import type { Meta, StoryObj } from "@storybook/react-vite";
import mermaid from "mermaid";
import { Diagrams } from "@wm-asset-workflows/ui-components";

const meta = {
  id: "shared-diagrams",
  title: "Shared/Display/Diagrams",
  component: Diagrams,
  args: {
    theme: "light",
    renderer: mermaid,
    diagrams: [
      {
        id: "workflow",
        title: "Asset workflow",
        code: "flowchart LR\n  Author --> Preview --> Export",
      },
    ],
  },
  argTypes: { renderer: { control: false }, theme: { control: false } },
  render: (args, context) => <Diagrams {...args} theme={context.globals.theme} />,
} satisfies Meta<typeof Diagrams>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {};
export const Empty: Story = { args: { diagrams: [] } };
export const Unavailable: Story = { args: { renderer: undefined } };
