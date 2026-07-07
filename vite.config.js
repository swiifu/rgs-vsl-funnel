import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        privacyPolicy: resolve(__dirname, "privacy-policy.html"),
        legalNotice: resolve(__dirname, "legal-notice.html"),
        thankYou: resolve(__dirname, "thank-you.html"),
      },
    },
  },
});
