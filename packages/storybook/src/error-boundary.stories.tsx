import type { Meta, StoryObj } from "@storybook/react-vite";
import { PreviewBoundary } from "@wm-asset-workflows/ui-components";

function FailedPreview(): never {
  throw new Error("Example preview failure");
}

const meta = {
  title: "Shared/PreviewBoundary",
  component: PreviewBoundary,
  args: { children: null },
  argTypes: { children: { control: false } },
} satisfies Meta<typeof PreviewBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Healthy: Story = {
  render: () => (
    <PreviewBoundary>
      <p>The preview rendered successfully.</p>
    </PreviewBoundary>
  ),
};
export const Failed: Story = {
  render: () => (
    <PreviewBoundary>
      <FailedPreview />
    </PreviewBoundary>
  ),
};
