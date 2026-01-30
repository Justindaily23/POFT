import { Outlet } from "react-router-dom"; // Add this
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "@/components/theme-provider";
import "@/index.css";

export default function RootLayout() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {/* This renders POFinancialWorkspace or any other child route */}
      <Outlet />

      <Analytics />
    </ThemeProvider>
  );
}
