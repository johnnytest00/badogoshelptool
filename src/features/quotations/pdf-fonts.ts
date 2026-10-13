import path from "node:path";
import { Font } from "@react-pdf/renderer";

Font.register({
  family: "Noto Sans",
  fonts: [
    { src: path.join(process.cwd(), "node_modules/@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff") },
    { src: path.join(process.cwd(), "node_modules/@fontsource/noto-sans/files/noto-sans-latin-ext-700-normal.woff"), fontWeight: 700 },
  ],
});
