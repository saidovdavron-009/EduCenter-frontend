"use client";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useUIStore } from "@/store/uiStore";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useUIStore();

  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    }
  }, [theme]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "10px",
              background: "var(--card)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              fontSize: "14px",
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
