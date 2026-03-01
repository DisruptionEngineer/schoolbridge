import type { Config } from "tailwindcss";
import { schoolBridgeTheme } from "@schoolbridge/ui/theme";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: schoolBridgeTheme,
  },
  plugins: [],
};

export default config;
