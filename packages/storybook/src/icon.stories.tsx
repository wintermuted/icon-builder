import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "@wm-asset-workflows/ui-components";

const meta = {
  id: "shared-icon",
  title: "Shared/Display/Icon",
  component: Icon,
  args: { name: "Sparkles" },
  argTypes: {
    name: {
      control: "select",
      options: [
        "ArrowLeft",
        "ArrowRight",
        "ChevronDown",
        "CircleCheck",
        "Check",
        "Copy",
        "Github",
        "Grid2x2",
        "ImagePlus",
        "ImageUp",
        "Info",
        "Link",
        "Moon",
        "PanelLeftClose",
        "PanelLeftOpen",
        "PanelRightClose",
        "PanelRightOpen",
        "Pencil",
        "Plus",
        "Save",
        "Sparkles",
        "Sun",
        "Trash2",
        "X",
      ],
    },
  },
  render: (args) => (
    <button className="btn" type="button">
      <Icon {...args} />
      <span>{args.name}</span>
    </button>
  ),
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Github: Story = { args: { name: "Github" } };
