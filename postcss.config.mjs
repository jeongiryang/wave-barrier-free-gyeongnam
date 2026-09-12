import tailwindcss from "@tailwindcss/postcss";
import { publicThemeStyles } from "./scripts/postcss-public-theme.mjs";

const config = { plugins: [tailwindcss(), publicThemeStyles()] };

export default config;
