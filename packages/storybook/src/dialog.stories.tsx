import { useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Dialog, type DialogProps } from "@wm-asset-workflows/ui-components";

function DialogExample(args: DialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button className="btn btn-sm" type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      {open && (
        <Dialog {...args} initialFocus={input} onClose={() => setOpen(false)}>
          <label>
            Name
            <input
              ref={input}
              className="wm-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button className="btn btn-sm" type="button" onClick={() => setOpen(false)}>
            Done
          </button>
        </Dialog>
      )}
    </>
  );
}

const meta = {
  title: "Shared/Dialog",
  component: Dialog,
  args: { title: "New item", children: null, onClose: () => {} },
  render: (args) => <DialogExample {...args} />,
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
