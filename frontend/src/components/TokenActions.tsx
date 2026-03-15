"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useMarketplace } from "@/hooks/useMarketplace";
import { Coins, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

export function TokenActions() {
  const { isConnected } = useAccount();
  const { mintUsdz, wrapUsdz, loading, error } = useMarketplace();
  const [wrapAmount, setWrapAmount] = useState("");
  const [showWrap, setShowWrap] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isConnected) return null;

  async function handleMint() {
    setSuccess(null);
    await mintUsdz();
    setSuccess("Minted 10 USDZ!");
  }

  async function handleWrap() {
    setSuccess(null);
    if (!wrapAmount) return;
    const amount = BigInt(Math.round(parseFloat(wrapAmount) * 1e6));
    await wrapUsdz(amount);
    setSuccess(`Wrapped ${wrapAmount} USDZ into cUSDZ!`);
    setWrapAmount("");
    setShowWrap(false);
  }

  return (
    <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-card">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-royal-50">
          <Coins className="h-5 w-5 text-royal-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-ink-800">Get Test Tokens</h3>
          <p className="text-xs text-ink-500">Mint USDZ and wrap to cUSDZ for payments</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleMint}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-royal-500 py-2.5 text-sm font-semibold text-white hover:bg-royal-600 disabled:opacity-50 transition"
          >
            {loading ? "Minting..." : "Mint 10 USDZ (Free)"}
          </button>
          <button
            onClick={() => setShowWrap(!showWrap)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-royal-200 py-2.5 text-sm font-semibold text-royal-600 hover:bg-royal-50 transition"
          >
            Shield USDZ <ArrowRight className="h-3.5 w-3.5" /> cUSDZ
          </button>
        </div>

        {showWrap && (
          <div className="flex gap-2 rounded-xl bg-surface-100 p-3">
            <input
              type="number"
              value={wrapAmount}
              onChange={(e) => setWrapAmount(e.target.value)}
              placeholder="Amount (e.g. 10)"
              min="0.000001"
              step="0.000001"
              className="flex-1 rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-ink-800 placeholder-ink-400 focus:border-royal-400 focus:outline-none"
            />
            <button
              onClick={handleWrap}
              disabled={loading || !wrapAmount}
              className="rounded-lg bg-royal-500 px-5 py-2 text-sm font-semibold text-white hover:bg-royal-600 disabled:opacity-50 transition"
            >
              {loading ? "..." : "Wrap"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 p-2.5 text-xs text-green-700">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          {success}
        </div>
      )}
    </div>
  );
}
