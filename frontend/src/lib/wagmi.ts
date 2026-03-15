"use client";

import { http, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { getDefaultConfig } from "connectkit";
import { injected } from "wagmi/connectors";

// Custom Sepolia chain with proper display info
const sepoliaChain = {
  ...sepolia,
  name: "Sepolia Testnet",
};

const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";
const hasValidWcId = wcProjectId.length > 10 && !wcProjectId.includes("your_");

export const wagmiConfig = createConfig(
  hasValidWcId
    ? getDefaultConfig({
        chains: [sepoliaChain],
        transports: {
          [sepolia.id]: http(
            process.env.NEXT_PUBLIC_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com"
          ),
        },
        walletConnectProjectId: wcProjectId,
        appName: "FHE2A Marketplace",
        appDescription: "Confidential digital license marketplace powered by Zama FHE",
        appUrl: typeof window !== "undefined" ? window.location.origin : "https://fhe2a.com",
      })
    : {
        chains: [sepoliaChain] as const,
        connectors: [injected()],
        transports: {
          [sepolia.id]: http(
            process.env.NEXT_PUBLIC_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com"
          ),
        },
      }
);
