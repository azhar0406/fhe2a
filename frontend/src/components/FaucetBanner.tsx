"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Droplets } from "lucide-react";
import { FaucetModal } from "./FaucetModal";

export function FaucetBanner() {
  const { isConnected } = useAccount();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="border-b border-royal-100 bg-gradient-to-r from-royal-50 via-white to-royal-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-royal-500" />
            <span className="text-xs font-medium text-royal-700">
              <span className="hidden sm:inline">Sepolia Testnet — </span>
              Get free cUSDZ tokens to start buying & selling
            </span>
          </div>
          <button
            onClick={() => setOpen(true)}
            disabled={!isConnected}
            className="rounded-lg bg-royal-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-royal-600 disabled:opacity-40 transition shadow-sm shadow-royal-500/20"
          >
            {isConnected ? "Free Tokens" : "Connect Wallet First"}
          </button>
        </div>
      </div>

      <FaucetModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
