import { defineConfig } from "vite";

// Dev server runs at the root ("/"); the production build is served from
// https://<user>.github.io/oh-my-metadata/, so assets need that subpath.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/oh-my-metadata/" : "/",
}));
