import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon, PreviewCard } from "@wm-asset-workflows/ui-components";

const preview = (
  <div style={{ display: "grid", placeItems: "center", height: 120 }}>
    <Icon name="ImagePlus" />
  </div>
);

const meta = {
  id: "shared-previewcard",
  title: "Shared/Display/PreviewCard",
  component: PreviewCard,
  args: {
    title: "Geometric mark",
    titleHref: "#example",
    preview,
    children: <p>Editable SVG asset</p>,
    footer: <small>mark-primary</small>,
  },
  argTypes: {
    header: { control: false },
    preview: { control: false },
    children: { control: false },
    footer: { control: false },
  },
  render: (args) => (
    <div style={{ maxWidth: 320 }}>
      <PreviewCard {...args} />
    </div>
  ),
} satisfies Meta<typeof PreviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Asset: Story = {};
export const Source: Story = {
  args: {
    className: "source-material-card",
    header: <h5>Source material</h5>,
    title: undefined,
    titleHref: undefined,
    children: <p>Reference image supplied by the project.</p>,
    footer: null,
  },
};
