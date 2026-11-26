import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { InlineRename, type InlineRenameProps } from "@wm-asset-workflows/ui-components";

function RenameExample(args: InlineRenameProps) {
  const [open, setOpen] = useState(args.open);
  const [value, setValue] = useState(args.value);
  const [status, setStatus] = useState(args.status);
  return (
    <div style={{ maxWidth: 540 }}>
      <button className="btn btn-sm" type="button" onClick={() => setOpen(true)}>
        Rename item
      </button>
      <InlineRename
        {...args}
        open={open}
        value={value}
        status={status}
        onValueChange={setValue}
        onSubmit={(event) => {
          event.preventDefault();
          setStatus(`Saved "${value}".`);
        }}
        onCancel={() => {
          setOpen(false);
          setValue(args.value);
          setStatus("");
        }}
      />
    </div>
  );
}

const meta = {
  id: "shared-inlinerename",
  title: "Shared/Controls/InlineRename",
  component: InlineRename,
  args: {
    open: true,
    value: "Reference",
    label: "Item name",
    status: "",
    onValueChange: () => {},
    onSubmit: () => {},
    onCancel: () => {},
  },
  render: (args) => <RenameExample {...args} />,
} satisfies Meta<typeof InlineRename>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Editable: Story = {};
export const Busy: Story = { args: { busy: true, status: "Saving..." } };
