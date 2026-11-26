import type { Meta, StoryObj } from "@storybook/react-vite";
import { PromptCarousel } from "@wm-asset-workflows/ui-components";

const meta = {
  title: "Shared/PromptCarousel",
  component: PromptCarousel,
  args: {
    prompts: [
      "Create a minimal geometric mark with one distinctive negative-space detail.",
      "Create a modular emblem that remains recognizable at favicon size.",
    ],
  },
  render: (args) => (
    <div style={{ maxWidth: 540 }}>
      <PromptCarousel {...args} />
    </div>
  ),
} satisfies Meta<typeof PromptCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Multiple: Story = {};
export const Single: Story = { args: { prompts: ["Create a geometric mark."] } };
export const Empty: Story = { args: { prompts: [] } };
