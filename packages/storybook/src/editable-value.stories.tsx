import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ActionGroup,
  EditableValue,
  FormField,
  type EditableValueProps,
} from "@wm-asset-workflows/ui-components";

function Example(args: EditableValueProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(args.value);
  return (
    <div style={{ width: 320, maxWidth: "100%" }}>
      <EditableValue {...args} value={value} onEdit={() => setEditing(true)} />
      {editing && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setValue(new FormData(event.currentTarget).get("value")?.toString() ?? "");
            setEditing(false);
          }}
        >
          <FormField label="Value">
            <input className="wm-input" name="value" defaultValue={String(value)} autoFocus />
          </FormField>
          <ActionGroup>
            <button className="wm-button" type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button className="wm-button" type="submit">
              Apply
            </button>
          </ActionGroup>
        </form>
      )}
    </div>
  );
}
const meta = {
  id: "shared-editablevalue",
  title: "Shared/Controls/EditableValue",
  component: EditableValue,
  args: { label: "ViewBox", value: "0 0 240 240", editLabel: "Edit ViewBox" },
  argTypes: {
    onEdit: { control: false },
    valueProps: { control: false },
    editButtonProps: { control: false },
  },
  render: (args) => <Example {...args} />,
} satisfies Meta<typeof EditableValue>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const LongValue: Story = {
  args: {
    label: "Title",
    value: "A geometric mark with a deliberately long accessible title",
    editLabel: "Edit title",
  },
};
