import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  SelectableListItem,
  type SelectableListItemProps,
} from "@wm-asset-workflows/ui-components";

function SelectionExample(args: SelectableListItemProps) {
  const [selected, setSelected] = useState("Rectangle");
  const [active, setActive] = useState<string | null>(null);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  return (
    <ul
      aria-label="Shapes"
      style={{
        display: "grid",
        gap: "0.35rem",
        listStyle: "none",
        padding: 0,
        width: 320,
        maxWidth: "100%",
      }}
    >
      {["Rectangle", "Circle"].map((shape) => (
        <SelectableListItem
          {...args}
          key={shape}
          selected={args.selected || selected === shape}
          active={active === shape}
          marked={marked.has(shape)}
          onMouseEnter={() => setActive(shape)}
          onMouseLeave={() => setActive(null)}
        >
          <input
            type="checkbox"
            aria-label={`Mark ${shape}`}
            checked={marked.has(shape)}
            onChange={(event) => {
              const checked = event.target.checked;
              setMarked((current) => {
                const next = new Set(current);
                if (checked) next.add(shape);
                else next.delete(shape);
                return next;
              });
            }}
          />
          <button
            className="wm-button wm-button--ghost"
            aria-pressed={selected === shape}
            onClick={() => setSelected(shape)}
          >
            {shape}
          </button>
          <code>{shape === "Rectangle" ? "rect" : "circle"}</code>
        </SelectableListItem>
      ))}
    </ul>
  );
}
const meta = {
  title: "Shared/SelectableListItem",
  component: SelectableListItem,
  render: (args) => <SelectionExample {...args} />,
} satisfies Meta<typeof SelectableListItem>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Interactive: Story = {};
export const Selected: Story = { args: { selected: true } };
export const DragTarget: Story = { args: { draggable: true, dropTarget: true } };
