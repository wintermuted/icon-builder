import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon, PageHeader } from "@wm-asset-workflows/ui-components";

const meta = {
  id: "shared-pageheader",
  title: "Shared/Layout/PageHeader",
  component: PageHeader,
  args: {
    title: "Project assets",
    leading: (
      <a href="#projects" aria-label="Back to projects">
        <Icon name="ArrowLeft" />
      </a>
    ),
    actions: (
      <button type="button" className="btn btn-sm">
        Save
      </button>
    ),
  },
  argTypes: {
    leading: { control: false },
    actions: { control: false },
    navigation: { control: false },
    meta: { control: false },
    children: { control: false },
  },
} satisfies Meta<typeof PageHeader>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Detail: Story = {};
export const WithNavigation: Story = {
  args: {
    navigation: (
      <nav aria-label="Breadcrumb">
        <a href="#projects">All projects</a>
      </nav>
    ),
    meta: <p>Four editable SVG assets</p>,
    sticky: true,
  },
};
