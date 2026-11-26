import type { Meta, StoryObj } from "@storybook/react-vite";
import { PreviewSurface } from "@wm-asset-workflows/ui-components";

const image = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect x="30" y="30" width="180" height="180" rx="32" fill="#6b5cff"/><circle cx="120" cy="120" r="48" fill="#fff"/></svg>')}`;
const meta = {
  id: "shared-previewsurface",
  title: "Shared/Display/PreviewSurface",
  component: PreviewSurface,
  args: { children: <img src={image} alt="Geometric mark" /> },
  argTypes: { children: { control: false } },
} satisfies Meta<typeof PreviewSurface>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Icon: Story = {};
export const LargeImage: Story = { args: { maxImageHeight: "360px", imageWidth: "100%" } };
