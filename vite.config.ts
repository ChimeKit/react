import { resolve } from "node:path";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    dts({
      entryRoot: "src",
      tsconfigPath: "./tsconfig.app.json",
      outDir: "dist",
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        styles: resolve(__dirname, "src/styles-entry.ts"),
      },
      name: "ChimeKitReact",
      formats: ["es", "cjs"],
      fileName: (format, entryName) => {
        if (entryName === "styles") {
          return format === "es" ? "styles.js" : "styles.cjs";
        }
        return format === "es" ? "index.js" : "index.cjs";
      },
    },
    rollupOptions: {
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) {
            if (assetInfo.name === "react.css" || assetInfo.name === "styles.css") {
              return "styles.css";
            }
            return assetInfo.name;
          }
          return "[name][extname]";
        },
      },
    },
  },
});
