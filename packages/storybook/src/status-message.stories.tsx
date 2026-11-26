import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusMessage } from "@wm-asset-workflows/ui-components";

const meta = {
  id: "shared-statusmessage",
  title: "Shared/Feedback/StatusMessage",
  component: StatusMessage,
  args: { tone: "progress", children: "Uploading reference images..." },
  argTypes: { tone: { control: "select", options: ["neutral", "progress", "success", "error"] } },
} satisfies Meta<typeof StatusMessage>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Progress: Story = {};
export const Error: Story = {
  args: { tone: "error", children: "Upload failed. Choose the image again to retry." },
};
