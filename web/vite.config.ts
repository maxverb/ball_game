import { defineConfig } from "vite";

// Vite emits compiled JS/CSS into `dist/build/` so we can reserve
// `dist/assets/` for the original SWING assets copied out of
// `public/assets/`. `base: "./"` keeps everything portable — it works
// locally under `npm run dev`, under a GitHub Pages project URL
// (`/ball_game/`), and under a static file server.
export default defineConfig({
  root: ".",
  base: "./",
  build: {
    target: "es2022",
    outDir: "dist",
    assetsDir: "build",
    sourcemap: true,
  },
  server: {
    port: 5173,
    strictPort: false,
    open: false,
  },
});
