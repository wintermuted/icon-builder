import { useId, useRef } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  AnchoredPopover,
  RangeNumberControl,
  type AnchoredPopoverProps,
} from "@wm-asset-workflows/ui-components";

function PopoverExample({ edge = false, ...args }: AnchoredPopoverProps & { edge?: boolean }) {
  const anchor = useRef<HTMLButtonElement | null>(null);
  const id = useId();
  return (
    <div style={edge ? { position: "fixed", bottom: 8, right: 8 } : undefined}>
      <button
        className="wm-button"
        ref={anchor}
        popoverTarget={id}
        aria-controls={id}
        aria-expanded="false"
      >
        Open controls
      </button>
      <AnchoredPopover {...args} id={id} anchorRef={anchor} />
    </div>
  );
}
const meta = {
  id: "shared-anchoredpopover",
  title: "Shared/Overlays/AnchoredPopover",
  component: AnchoredPopover,
  args: {
    anchorRef: { current: null },
    "aria-label": "Preview controls",
    children: <RangeNumberControl label="Opacity" min={0} max={1} step={0.01} defaultValue={0.5} />,
  },
  argTypes: {
    anchorRef: { control: false },
    children: { control: false },
    onOpenChange: { control: false },
  },
  render: (args) => <PopoverExample {...args} />,
} satisfies Meta<typeof AnchoredPopover>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const ViewportEdge: Story = {
  parameters: { layout: "fullscreen" },
  render: (args) => <PopoverExample {...args} edge />,
};
export const LongContent: Story = {
  args: {
    style: { width: 360 },
    children: (
      <div>
        <h3>Preview controls</h3>
        {Array.from({ length: 20 }, (_, index) => (
          <p key={index}>
            Additional setting {index + 1}: scrollable content stays within the available viewport.
          </p>
        ))}
      </div>
    ),
  },
};
