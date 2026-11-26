import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const packagePath = (name: string) => dirname(require.resolve(`${name}/package.json`));

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  addons: [packagePath("@storybook/addon-docs")],
  framework: {
    name: packagePath("@storybook/react-vite"),
    options: {
      builder: { viteConfigPath: fileURLToPath(new URL("./vite.config.ts", import.meta.url)) },
    },
  },
  async viteFinal(config) {
    return mergeConfig(config, { base: "./" });
  },
};

export default config;
