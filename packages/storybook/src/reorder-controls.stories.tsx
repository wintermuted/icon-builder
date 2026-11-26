import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReorderControls, type ReorderControlsProps } from "@wm-asset-workflows/ui-components";

function ReorderExample(args: ReorderControlsProps) {
  const [items, setItems] = useState(["Alpha", "Beta", "Gamma"]);
  const move = (index: number, offset: number) =>
    setItems((current) => {
      const next = [...current];
      const item = next.splice(index, 1)[0];
      if (item !== undefined) next.splice(index + offset, 0, item);
      return next;
    });
  return (
    <ol style={{ display: "grid", gap: "0.5rem", paddingLeft: "1.5rem" }}>
      {items.map((item, index) => (
        <li key={item}>
          <span style={{ display: "inline-flex", gap: "1rem", alignItems: "center" }}>
            <span>{item}</span>
            <ReorderControls
              {...args}
              label={item}
              upDisabled={index === 0}
              downDisabled={index === items.length - 1}
              onMoveUp={() => move(index, -1)}
              onMoveDown={() => move(index, 1)}
            />
          </span>
        </li>
      ))}
    </ol>
  );
}
const meta = {
  id: "shared-reordercontrols",
  title: "Shared/Controls/ReorderControls",
  component: ReorderControls,
  args: { label: "item" },
  argTypes: { onMoveUp: { control: false }, onMoveDown: { control: false } },
} satisfies Meta<typeof ReorderControls>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Interactive: Story = { render: (args) => <ReorderExample {...args} /> };
export const Boundary: Story = { args: { label: "first item", upDisabled: true } };
export const Disabled: Story = { args: { disabled: true } };
