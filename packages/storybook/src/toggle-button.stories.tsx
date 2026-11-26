import type { Meta, StoryObj } from "@storybook/react-vite";
import { useArgs } from "storybook/preview-api";
import { ToggleButton, type ToggleButtonProps } from "@wm-asset-workflows/ui-components";

const meta = {
  title: "Shared/ToggleButton",
  component: ToggleButton,
  args: { pressed: false, children: "Show grid", icon: "Grid2x2" },
  render: function Render(args) {
    const [{ pressed }, updateArgs] = useArgs<ToggleButtonProps>();
    return (
      <ToggleButton
        {...args}
        pressed={pressed}
        onPressedChange={(pressed) => updateArgs({ pressed })}
      />
    );
  },
  argTypes: { icon: { control: false }, onPressedChange: { control: false } },
} satisfies Meta<typeof ToggleButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Interactive: Story = {};
export const Disabled: Story = { args: { disabled: true, pressed: true } };
