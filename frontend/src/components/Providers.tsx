"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider } from "connectkit";
import { wagmiConfig } from "@/lib/wagmi";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          theme="auto"
          mode="light"
          customTheme={{
            "--ck-font-family": "Inter, system-ui, sans-serif",
            "--ck-accent-color": "#4361ee",
            "--ck-accent-text-color": "#ffffff",
            "--ck-border-radius": "12px",
            "--ck-overlay-background": "rgba(0, 0, 0, 0.4)",
            "--ck-body-background": "#ffffff",
            "--ck-body-color": "#1a1a2e",
            "--ck-primary-button-background": "#4361ee",
            "--ck-primary-button-color": "#ffffff",
            "--ck-primary-button-hover-background": "#2d42d4",
          }}
          options={{
            enforceSupportedChains: true,
            hideNoWalletCTA: false,
            walletConnectName: "Other Wallets",
          }}
        >
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
