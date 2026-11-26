import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileDropzone, type FileDropzoneProps } from "@wm-asset-workflows/ui-components";

function DropzoneExample(args: FileDropzoneProps) {
  const [names, setNames] = useState<string[]>([]);
  const [selection, setSelection] = useState(0);
  return (
    <div style={{ maxWidth: 420 }}>
      <FileDropzone
        {...args}
        onFilesSelected={(files) => {
          setNames(files.map((file) => file.name));
          setSelection((selection) => selection + 1);
        }}
      />
      <p role="status">
        {names.length ? `Selection ${selection}: ${names.join(", ")}` : "No files selected."}
      </p>
    </div>
  );
}

const meta = {
  title: "Shared/FileDropzone",
  component: FileDropzone,
  args: {
    accept: "image/png,image/jpeg,image/webp,image/gif",
    multiple: true,
    label: "Drop images here or choose files",
    hint: "PNG, JPEG, WebP, or GIF",
    onFilesSelected: () => {},
  },
  render: (args) => <DropzoneExample {...args} />,
} satisfies Meta<typeof FileDropzone>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Images: Story = {};
export const Disabled: Story = { args: { disabled: true } };
