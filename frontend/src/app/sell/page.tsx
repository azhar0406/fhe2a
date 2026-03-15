"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "@/lib/contracts";
import { CreateListing } from "@/components/CreateListing";
import { TokenActions } from "@/components/TokenActions";
import { Tag, Shield, Zap, Lock, ShieldAlert } from "lucide-react";
import Link from "next/link";

function getProvider() {
  const rpc = process.env.NEXT_PUBLIC_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
  return new ethers.JsonRpcProvider(rpc);
}

export default function SellPage() {
  const { isConnected, address } = useAccount();
  const [owner, setOwner] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function fetchOwner() {
      try {
        const market = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, getProvider());
        const o = await market.owner();
        setOwner(o.toLowerCase());
      } catch (err) {
        console.error("Failed to fetch contract owner:", err);
        setOwner(null);
      } finally {
        setChecking(false);
      }
    }
    fetchOwner();
  }, []);

  const isAdmin = !!address && !!owner && address.toLowerCase() === owner;

  if (checking) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <div className="flex items-center justify-center gap-3 text-ink-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-royal-500 border-t-transparent" />
          Checking permissions...
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <div className="rounded-2xl border border-surface-200 bg-surface-100 p-16 text-center">
          <Lock className="mx-auto mb-4 h-12 w-12 text-surface-300" />
          <h2 className="mb-2 text-lg font-bold text-ink-700">Connect Your Wallet</h2>
          <p className="text-sm text-ink-500">Connect your wallet to access this page.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-16 text-center">
          <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-red-300" />
          <h2 className="mb-2 text-lg font-bold text-red-700">Admin Only</h2>
          <p className="mb-6 text-sm text-red-600">
            Only the contract admin can create new listings. As a user, you can buy licenses from the marketplace and resell them at your own price.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/marketplace"
              className="rounded-xl bg-royal-500 px-6 py-3 font-semibold text-white hover:bg-royal-600 transition"
            >
              Browse Marketplace
            </Link>
            <Link
              href="/orders"
              className="rounded-xl border border-surface-300 bg-white px-6 py-3 font-semibold text-ink-700 hover:bg-surface-100 transition"
            >
              My Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <h1 className="text-3xl font-bold text-ink-800">Admin: Create Listing</h1>
          <span className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-600">Admin</span>
        </div>
        <p className="text-ink-500">
          Create a new license listing. The key will be encrypted with FHE and stored securely on-chain.
          Users can buy and resell at their own price.
        </p>
      </div>

      {/* Steps */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        {[
          { step: "1", title: "Get cUSDZ", desc: "Mint & wrap tokens", icon: Tag },
          { step: "2", title: "Fill Details", desc: "Product info & key", icon: Shield },
          { step: "3", title: "List & Earn", desc: "Start selling", icon: Zap },
        ].map((s) => (
          <div key={s.step} className="flex items-center gap-3 rounded-xl border border-surface-200 bg-surface-100 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-royal-500 text-sm font-bold text-white">
              {s.step}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-700">{s.title}</p>
              <p className="text-[11px] text-ink-400">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Token actions */}
      <div className="mb-6">
        <TokenActions />
      </div>

      {/* Create listing form */}
      <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-card">
        <h2 className="mb-5 text-lg font-bold text-ink-800">Listing Details</h2>
        <CreateListing />
      </div>
    </div>
  );
}
