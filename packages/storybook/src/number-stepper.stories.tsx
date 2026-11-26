import { useArgs } from "storybook/preview-api";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { NumberStepper } from "@wm-asset-workflows/ui-components";

const meta = {
  title: "Shared/NumberStepper",
  component: NumberStepper,
  args: { label: "Width", value: 24, step: 1 },
  argTypes: { inputProps: { control: false }, onValueChange: { control: false } },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return <NumberStepper {...args} onValueChange={(value) => updateArgs({ value })} />;
  },
} satisfies Meta<typeof NumberStepper>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const BoundedFractional: Story = {
  args: { label: "Opacity", value: 0.5, step: 0.1, min: 0, max: 1 },
};
export const Disabled: Story = { args: { disabled: true } };
