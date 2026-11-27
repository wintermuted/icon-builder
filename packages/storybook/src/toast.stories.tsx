import { useCallback, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Toast, type ToastProps } from "@wm-asset-workflows/ui-components";

function ToastExample(args: ToastProps) {
  const [notice, setNotice] = useState({ message: args.message, revision: 0 });
  const dismiss = useCallback(() => setNotice((notice) => ({ ...notice, message: "" })), []);
  return (
    <>
      <button
        className="btn btn-sm"
        type="button"
        onClick={() =>
          setNotice((notice) => ({ message: args.message, revision: notice.revision + 1 }))
        }
      >
        Show notification
      </button>
      <Toast {...args} message={notice.message} resetKey={notice.revision} onDismiss={dismiss} />
    </>
  );
}

const meta = {
  id: "shared-toast",
  title: "Shared/Feedback/Toast",
  component: Toast,
  parameters: {
    docs: {
      description: {
        component:
          "Icon Builder's timed notification adapter around the central Toast. Repeated copy messages restart the local timer; the shared dismiss action can close them immediately.",
      },
    },
  },
  args: { message: "Link copied.", duration: 2400 },
  render: (args) => <ToastExample {...args} />,
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Notification: Story = {};
