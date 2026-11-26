import type { Meta, StoryObj } from "@storybook/react-vite";
import { NumberStepper, PropertyList } from "@wm-asset-workflows/ui-components";

const meta = {
  id: "shared-propertylist",
  title: "Shared/Display/PropertyList",
  component: PropertyList,
  args: {
    items: [
      { label: "Elements", value: "3 primitives" },
      { label: "ViewBox", value: <code>0 0 240 240</code> },
      { label: "Description", value: "An editable geometric mark." },
    ],
  },
  argTypes: { items: { control: false } },
} satisfies Meta<typeof PropertyList>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ReadOnly: Story = {};
export const Editable: Story = {
  args: {
    items: [
      { label: "Width", value: <NumberStepper label="Width" defaultValue={50} min={1} /> },
      {
        label: "Opacity",
        value: <NumberStepper label="Opacity" defaultValue={1} min={0} max={1} step={0.1} />,
      },
    ],
  },
};
