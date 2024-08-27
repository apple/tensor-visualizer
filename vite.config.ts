import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [svelte({ emitCss: false })],
  build: {
    lib: {
      entry: "./src/lib/index.ts",
      formats: ["es"],
      fileName: "bundle",
    },
    outDir: "src/tensor_visualizer/static",
  },
});
