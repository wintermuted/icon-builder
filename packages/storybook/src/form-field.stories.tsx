import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FormField, type FormFieldProps } from "@wm-asset-workflows/ui-components";

function ValidatedField(args: FormFieldProps) {
  const [value, setValue] = useState("");
  const error = value
    ? value.trim().length < 3
      ? "Use at least three characters."
      : undefined
    : args.error;
  return (
    <FormField {...args} error={error}>
      <input
        className="wm-input"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
        }}
      />
    </FormField>
  );
}

const meta = {
  title: "Shared/FormField",
  component: FormField,
  args: {
    label: "Project name",
    required: true,
    hint: "Choose a short, recognizable name.",
    children: <input className="wm-input" defaultValue="Geometric marks" />,
  },
  argTypes: { label: { control: "text" }, hint: { control: "text" }, children: { control: false } },
} satisfies Meta<typeof FormField>;
export default meta;
type Story = StoryObj<typeof meta>;
export const WithHint: Story = {};
export const WithError: Story = {
  args: { error: "Use at least three characters." },
  render: (args) => <ValidatedField {...args} />,
};
export const Inline: Story = {
  args: {
    label: "Grid spacing",
    inline: true,
    required: false,
    hint: undefined,
    children: (
      <input type="number" className="wm-input" defaultValue={8} min={1} style={{ width: 80 }} />
    ),
  },
};
