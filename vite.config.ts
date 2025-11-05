import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path"; // safer in ESM

// ⛔ DO NOT import ./server at top-level

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: ["./client", "./shared"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  // build = only react plugin; dev(serve) = react + expressPlugin
  plugins: mode === "development" ? [react(), expressPlugin()] : [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // dev-only
    async configureServer(server) {
      // lazy import so build time pe server code load na ho
      const { createServer } = await import("./server");
      const app = createServer();
      server.middlewares.use(app);
    },
  };
}
