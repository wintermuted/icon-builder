import { useState } from "react";
import { useArgs } from "storybook/preview-api";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SplitButton, type SplitButtonProps } from "@wm-asset-workflows/ui-components";

function SplitExample(args: SplitButtonProps) {
  const [lastAction, setLastAction] = useState<string | null>(null);
  return (
    <div>
      <SplitButton {...args} onAction={(value) => setLastAction(value)} />
      <p role="status">{lastAction ? `Added ${lastAction}` : "Choose a shape, then add it."}</p>
    </div>
  );
}

function ChangingOptionsExample(args: SplitButtonProps) {
  const [options, setOptions] = useState(args.options);
  const [lastAction, setLastAction] = useState<string | null>(null);
  return (
    <div>
      <SplitButton {...args} options={options} onAction={setLastAction} />
      <button
        type="button"
        onClick={() =>
          setOptions((current) => current.filter((option) => option.value !== "circle"))
        }
      >
        Remove Circle
      </button>
      <button type="button" onClick={() => setOptions([])}>
        Clear options
      </button>
      <button type="button" onClick={() => setOptions(args.options)}>
        Restore options
      </button>
      <p role="status">{lastAction ? `Added ${lastAction}` : "Choose a shape, then add it."}</p>
    </div>
  );
}
const meta = {
  id: "shared-splitbutton",
  title: "Shared/Controls/SplitButton",
  component: SplitButton,
  args: {
    actionLabel: "Add element",
    menuLabel: "Choose shape",
    value: "rect",
    options: [
      { value: "rect", label: "Rectangle", icon: "Square" },
      { value: "circle", label: "Circle", icon: "Circle" },
      { value: "path", label: "Path", icon: "PenLine" },
    ],
  },
  argTypes: {
    options: { control: false },
    onAction: { control: false },
    onValueChange: { control: false },
    buttonProps: { control: false },
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return <SplitExample {...args} onValueChange={(value) => updateArgs({ value })} />;
  },
} satisfies Meta<typeof SplitButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Empty: Story = { args: { options: [], value: undefined } };
export const ChangingOptions: Story = {
  args: { value: undefined, defaultValue: "rect" },
  render: (args) => <ChangingOptionsExample {...args} />,
};
