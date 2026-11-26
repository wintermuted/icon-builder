import { useEffect } from "react";
import type { Preview } from "@storybook/react-vite";
import "@wintermuted/ui-theme/index.css";
import "../../../preview/styles.css";

const preview: Preview = {
  tags: ["autodocs"],
  initialGlobals: { theme: "light" },
  globalTypes: {
    theme: {
      description: "App color theme",
      toolbar: {
        icon: "paintbrush",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      useEffect(() => {
        document.documentElement.setAttribute("data-theme", context.globals.theme);
      }, [context.globals.theme]);
      return (
        <div className="preview-shell">
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
