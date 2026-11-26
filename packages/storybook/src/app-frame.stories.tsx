import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppFrame, PageHeader } from "@wm-asset-workflows/ui-components";

const meta = {
  title: "Shared/AppFrame",
  component: AppFrame,
  args: {
    header: (
      <header style={{ padding: "1rem", borderBottom: "1px solid var(--wm-color-border)" }}>
        <strong>Asset workspace</strong>
      </header>
    ),
    footer: (
      <footer style={{ padding: "1rem", borderTop: "1px solid var(--wm-color-border)" }}>
        Project documentation
      </footer>
    ),
    children: (
      <>
        <PageHeader title="Project overview" />
        <p>The footer follows content without covering it.</p>
      </>
    ),
    style: { minHeight: "calc(100dvh - 4rem)" },
  },
  argTypes: {
    header: { control: false },
    footer: { control: false },
    overlays: { control: false },
    children: { control: false },
    style: { control: false },
  },
} satisfies Meta<typeof AppFrame>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ShortContent: Story = {};
export const LongContent: Story = {
  args: {
    children: Array.from({ length: 20 }, (_, index) => (
      <section key={index}>
        <h4>Asset {index + 1}</h4>
        <p>Editable SVG and reference material.</p>
      </section>
    )),
  },
};
