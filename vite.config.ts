import { defineConfig } from "vite";

// Served from https://<user>.github.io/oh-my-metadata/, so assets must
// resolve under that subpath. Use "/" for local dev and root-domain hosts.
export default defineConfig({
  base: "/oh-my-metadata/",
});
