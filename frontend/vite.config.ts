import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(), // Tailwind v4 Vite plugin
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
        dedupe: ["react", "react-dom"], // avoids multiple React copies
    },
    server: {
        port: 5173,
        host: "0.0.0.0",
        proxy: {
            "/api": {
                target: "http://localhost:3000", // Your NestJS backend
                changeOrigin: true,
            },
        },
    },
});
