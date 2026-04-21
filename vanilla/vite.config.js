import { defineConfig, loadEnv } from "vite";
import { kryptopayIntentProxyPlugin } from "../shared/kryptopay-intent-proxy.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [kryptopayIntentProxyPlugin({ env })],
  };
});
