"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { getMyPurchases, getMyListings } from "@/lib/chain";
import { ListingCard } from "@/components/ListingCard";
import type { Listing } from "@/types";
import { ShoppingBag, Tag, Package, Lock } from "lucide-react";
import { ListingGridSkeleton } from "@/components/Skeleton";

function getSigner() {
  if (typeof window === "undefined" || !window.ethereum) return null;
  return new ethers.BrowserProvider(window.ethereum).getSigner();
}

export default function OrdersPage() {
  const { isConnected, address } = useAccount();
  const [tab, setTab] = useState<"purchases" | "sales">("purchases");
  const [orders, setOrders] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const signer = await getSigner();
      if (!signer) throw new Error("No signer");
      if (tab === "purchases") {
        setOrders(await getMyPurchases(signer));
      } else {
        setOrders(await getMyListings(signer));
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [isConnected, tab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20">
        <div className="rounded-2xl border border-surface-200 bg-surface-100 p-16 text-center">
          <Lock className="mx-auto mb-4 h-12 w-12 text-surface-300" />
          <h2 className="mb-2 text-lg font-bold text-ink-700">Connect Your Wallet</h2>
          <p className="text-sm text-ink-500">Connect your wallet to view your orders and sales.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-ink-800">My Orders</h1>
        <p className="text-ink-500">View your purchases and sales</p>
      </div>

      <div className="mb-8 flex gap-2">
        {[
          { key: "purchases" as const, label: "My Purchases", icon: ShoppingBag },
          { key: "sales" as const, label: "My Sales", icon: Tag },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              tab === t.key
                ? "bg-royal-500 text-white shadow-md shadow-royal-500/20"
                : "border border-surface-300 bg-white text-ink-600 hover:border-royal-300 hover:text-royal-600"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <ListingGridSkeleton count={4} />
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-surface-200 bg-surface-100 p-16 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-surface-300" />
          <h3 className="mb-2 text-lg font-semibold text-ink-700">
            {tab === "purchases" ? "No purchases yet" : "No sales yet"}
          </h3>
          <p className="text-sm text-ink-500">
            {tab === "purchases"
              ? "Browse the marketplace to find your first license."
              : "List your first license to start selling."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orders.map((listing, i) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <ListingCard listing={listing} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
