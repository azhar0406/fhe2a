"use client";

import { TokenActions } from "@/components/TokenActions";
import { useAccount } from "wagmi";
import { Wallet, Lock } from "lucide-react";

export default function WalletPage() {
  const { isConnected, address } = useAccount();

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <div className="rounded-2xl border border-surface-200 bg-surface-100 p-16 text-center">
          <Lock className="mx-auto mb-4 h-12 w-12 text-surface-300" />
          <h2 className="mb-2 text-lg font-bold text-ink-700">Connect Your Wallet</h2>
          <p className="text-sm text-ink-500">Connect your wallet to manage your tokens.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-ink-800">Wallet</h1>
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-ink-400" />
          <p className="font-mono text-sm text-ink-500">{address}</p>
        </div>
      </div>

      <TokenActions />

      <div className="mt-6 rounded-2xl border border-surface-200 bg-white p-6 shadow-card">
        <h3 className="mb-3 text-lg font-bold text-ink-800">About Tokens</h3>
        <div className="space-y-4 text-sm text-ink-600">
          <div className="rounded-xl bg-surface-100 p-4">
            <p className="font-semibold text-ink-700">USDZ (Plaintext Stablecoin)</p>
            <p className="mt-1 text-ink-500">
              Zama&apos;s test stablecoin on Sepolia. Mint 10 USDZ for free per call.
              This is a regular ERC-20 token with visible balances.
            </p>
          </div>
          <div className="rounded-xl bg-surface-100 p-4">
            <p className="font-semibold text-ink-700">cUSDZ (Confidential Wrapped USDZ)</p>
            <p className="mt-1 text-ink-500">
              The FHE-encrypted version of USDZ. When you wrap USDZ into cUSDZ, your balance
              and transfer amounts become encrypted on-chain. This is the payment token used in the marketplace.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
