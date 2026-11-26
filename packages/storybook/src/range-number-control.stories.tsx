import { useArgs } from "storybook/preview-api";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { RangeNumberControl } from "@wm-asset-workflows/ui-components";

const meta = {
  id: "shared-rangenumbercontrol",
  title: "Shared/Controls/RangeNumberControl",
  component: RangeNumberControl,
  args: { label: "Opacity", value: 0.5, min: 0, max: 1, step: 0.01 },
  argTypes: {
    inputProps: { control: false },
    sliderProps: { control: false },
    onValueChange: { control: false },
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return <RangeNumberControl {...args} onValueChange={(value) => updateArgs({ value })} />;
  },
} satisfies Meta<typeof RangeNumberControl>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const WholeNumbers: Story = { args: { label: "Size", value: 24, min: 8, max: 64, step: 4 } };
export const Disabled: Story = { args: { disabled: true } };
