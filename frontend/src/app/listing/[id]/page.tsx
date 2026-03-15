"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { getListing as getListingFromChain, getListingsForProduct, isResold } from "@/lib/chain";
import { useMarketplace } from "@/hooks/useMarketplace";
import { useFHE } from "@/hooks/useFHE";
import { ListingStatus, STATUS_LABELS, type Listing } from "@/types";
import {
  Shield, Lock, Eye, XCircle, AlertTriangle, ArrowLeftRight,
  CheckCircle2, Clock, Tag, ChevronLeft, Copy, Check, User, Calendar,
  ShoppingCart, Users
} from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { ListingDetailSkeleton } from "@/components/Skeleton";

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const { address } = useAccount();
  const {
    buyLicense, revealLicense, cancelListing, releaseFunds,
    openDispute, resellLicense,
  } = useMarketplace();
  const { decryptLicense, decrypting } = useFHE();

  const [listing, setListing] = useState<Listing | null>(null);
  const [otherSellers, setOtherSellers] = useState<Listing[]>([]);
  const [alreadyResold, setAlreadyResold] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [decryptedCode, setDecryptedCode] = useState<string | null>(null);
  const [decryptedPin, setDecryptedPin] = useState<string | null>(null);
  const [resellPrice, setResellPrice] = useState("");
  const [showResell, setShowResell] = useState(false);
  const [copied, setCopied] = useState<"code" | "pin" | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // tracks which action is loading

  const fetchListing = useCallback(async () => {
    setPageLoading(true);
    try {
      const data = await getListingFromChain(id);
      setListing(data);

      // Check if this listing has already been resold (on-chain)
      try {
        setAlreadyResold(await isResold(id));
      } catch {
        setAlreadyResold(false);
      }

      // Fetch other sellers for the same product (G2A-style)
      if (data.productName) {
        try {
          const others = await getListingsForProduct(data.productName);
          // Exclude the current listing
          setOtherSellers(others.filter(l => l.id !== id));
        } catch {
          setOtherSellers([]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch listing from chain:", err);
      setListing(null);
    } finally {
      setPageLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  async function runAction(name: string, fn: () => Promise<any>) {
    setActionLoading(name);
    try {
      await fn();
      await fetchListing(); // auto-refresh after every action
    } catch (err) {
      console.error(`${name} failed:`, err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBuy() {
    await runAction("buy", () => buyLicense(id));
  }

  async function handleReveal() {
    await runAction("reveal", () => revealLicense(id));
  }

  async function handleDecrypt() {
    setActionLoading("decrypt");
    setDecryptError(null);
    try {
      const { code, pin } = await decryptLicense(id);
      setDecryptedCode(code);
      setDecryptedPin(pin);
    } catch (err: any) {
      console.error("Decrypt failed:", err);
      setDecryptError(err?.message || "Decryption failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel() {
    await runAction("cancel", () => cancelListing(id));
  }

  async function handleRelease() {
    await runAction("release", () => releaseFunds(id));
  }

  async function handleDispute() {
    await runAction("dispute", () => openDispute(id));
  }

  async function handleResell() {
    const priceInUnits = BigInt(Math.round(parseFloat(resellPrice) * 1e6));
    await runAction("resell", async () => {
      await resellLicense(id, priceInUnits);
      setShowResell(false);
      // Navigate to orders/sales after reselling
      router.push("/orders");
    });
  }

  function copyToClipboard(text: string, type: "code" | "pin") {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  if (pageLoading) {
    return <ListingDetailSkeleton />;
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Tag className="mx-auto mb-4 h-16 w-16 text-surface-300" />
        <h2 className="mb-2 text-xl font-bold text-ink-800">Listing not found</h2>
        <p className="mb-6 text-ink-500">This listing may have been removed or doesn&apos;t exist on-chain.</p>
        <Link href="/marketplace" className="rounded-xl bg-royal-500 px-6 py-3 font-semibold text-white hover:bg-royal-600 transition">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const priceFormatted = (Number(listing.price) / 1e6).toFixed(2);
  const isSeller = address?.toLowerCase() === listing.seller.toLowerCase();
  const isBuyer = address?.toLowerCase() === listing.buyer?.toLowerCase();
  const canBuy = listing.status === ListingStatus.Active && !isSeller && !!address;
  const canCancel = listing.status === ListingStatus.Active && isSeller;
  const canReveal = isBuyer && listing.status === ListingStatus.Sold && !listing.isRevealed;
  const canDecrypt = isBuyer && listing.isRevealed;
  const canRelease = listing.status === ListingStatus.Sold && isBuyer && !listing.fundsReleased;
  const canDispute = listing.status === ListingStatus.Sold && isBuyer && !listing.fundsReleased;
  // alreadyResold is fetched from contract (resold[originalId])
  const canResell = isBuyer && listing.fundsReleased && !alreadyResold;

  const STATUS_STYLES: Record<number, string> = {
    [ListingStatus.Active]: "bg-green-50 text-green-700 border-green-200",
    [ListingStatus.Sold]: "bg-blue-50 text-blue-700 border-blue-200",
    [ListingStatus.Cancelled]: "bg-gray-50 text-gray-600 border-gray-200",
    [ListingStatus.Disputed]: "bg-red-50 text-red-700 border-red-200",
    [ListingStatus.Resolved]: "bg-amber-50 text-amber-700 border-amber-200",
  };

  function ActionButton({ name, onClick, disabled, className, children }: {
    name: string; onClick: () => void; disabled?: boolean; className: string; children: React.ReactNode;
  }) {
    const isLoading = actionLoading === name;
    return (
      <button onClick={onClick} disabled={disabled || !!actionLoading} className={className}>
        {isLoading ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {name === "buy" && "Buying on-chain..."}
            {name === "reveal" && "Revealing..."}
            {name === "decrypt" && "Decrypting with FHE..."}
            {name === "cancel" && "Cancelling..."}
            {name === "release" && "Releasing funds..."}
            {name === "dispute" && "Opening dispute..."}
            {name === "resell" && "Creating resale listing..."}
          </>
        ) : children}
      </button>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/marketplace" className="mb-6 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-royal-600 transition">
        <ChevronLeft className="h-4 w-4" />
        Back to Marketplace
      </Link>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Left: Image + Details */}
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="overflow-hidden rounded-2xl border border-surface-200">
            <ProductImage
              src={listing.imageUrl}
              alt={listing.productName}
              category={listing.category}
              className="h-80 w-full lg:h-96"
            />
          </div>

          <div className="mt-6 rounded-2xl border border-surface-200 bg-white p-6">
            <h3 className="mb-3 text-lg font-bold text-ink-800">Description</h3>
            <p className="text-sm leading-relaxed text-ink-600">{listing.description}</p>
          </div>

          <div className="mt-4 rounded-2xl border border-surface-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-bold text-ink-800">Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-100">
                  <Tag className="h-4 w-4 text-ink-500" />
                </div>
                <div>
                  <p className="text-xs text-ink-400">Listing ID</p>
                  <p className="text-sm font-medium text-ink-700">#{listing.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-100">
                  <User className="h-4 w-4 text-ink-500" />
                </div>
                <div>
                  <p className="text-xs text-ink-400">Seller</p>
                  <p className="text-sm font-mono font-medium text-ink-700">{listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-100">
                  <Calendar className="h-4 w-4 text-ink-500" />
                </div>
                <div>
                  <p className="text-xs text-ink-400">Listed</p>
                  <p className="text-sm font-medium text-ink-700">{new Date(listing.createdAt * 1000).toLocaleDateString()}</p>
                </div>
              </div>
              {listing.soldAt > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-100">
                    <CheckCircle2 className="h-4 w-4 text-ink-500" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-400">Sold</p>
                    <p className="text-sm font-medium text-ink-700">{new Date(listing.soldAt * 1000).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Other sellers for same product (G2A-style) */}
          {otherSellers.length > 0 && (
            <div className="mt-4 rounded-2xl border border-surface-200 bg-white p-6">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-royal-500" />
                <h3 className="text-lg font-bold text-ink-800">
                  Other Sellers ({otherSellers.length})
                </h3>
              </div>
              <div className="space-y-2">
                {otherSellers.map((other) => (
                  <Link
                    key={other.id}
                    href={`/listing/${other.id}`}
                    className="flex items-center justify-between rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 hover:border-royal-300 hover:bg-royal-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-200">
                        <User className="h-4 w-4 text-ink-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink-700">
                          {other.seller.slice(0, 6)}...{other.seller.slice(-4)}
                        </p>
                        <p className="text-xs text-ink-400">Listing #{other.id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-ink-800">
                        {(Number(other.price) / 1e6).toFixed(2)}
                      </p>
                      <p className="text-xs text-ink-400">cUSDZ</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Right: Purchase panel */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="sticky top-36 space-y-4">
            <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-lg bg-royal-50 px-3 py-1 text-xs font-semibold text-royal-600">
                  {listing.category}
                </span>
                <span className={`rounded-lg border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[listing.status]}`}>
                  {STATUS_LABELS[listing.status]}
                </span>
              </div>

              <h1 className="mb-4 text-2xl font-bold text-ink-800">{listing.productName}</h1>

              <div className="mb-6 rounded-xl bg-surface-100 p-4">
                <p className="text-xs font-medium text-ink-500">
                  {otherSellers.length > 0 ? "Best Price" : "Price"}
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-ink-900">{priceFormatted}</span>
                  <span className="text-sm font-semibold text-ink-400">cUSDZ</span>
                </div>
                {otherSellers.length > 0 && (
                  <p className="mt-1 text-xs text-ink-400">
                    {otherSellers.length + 1} seller{otherSellers.length > 0 ? "s" : ""} available
                  </p>
                )}
              </div>

              {!address && listing.status === ListingStatus.Active && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Connect your wallet to purchase this license.
                </div>
              )}

              <div className="space-y-3">
                {canBuy && (
                  <ActionButton
                    name="buy"
                    onClick={handleBuy}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-royal-500 py-4 text-lg font-bold text-white shadow-lg shadow-royal-500/20 hover:bg-royal-600 disabled:opacity-50 transition-all"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Buy Now for {priceFormatted} cUSDZ
                  </ActionButton>
                )}

                {listing.status === ListingStatus.Active && isSeller && (
                  <div className="rounded-xl bg-surface-100 p-3 text-center text-sm text-ink-500">
                    You are the seller of this listing.
                  </div>
                )}

                {canReveal && (
                  <ActionButton
                    name="reveal"
                    onClick={handleReveal}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3.5 font-semibold text-white shadow-lg shadow-purple-500/20 hover:bg-purple-700 disabled:opacity-50 transition-all"
                  >
                    <Eye className="h-4 w-4" /> Reveal License
                  </ActionButton>
                )}

                {canDecrypt && !decryptedCode && (
                  <ActionButton
                    name="decrypt"
                    onClick={handleDecrypt}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 font-semibold text-white shadow-lg shadow-green-500/20 hover:bg-green-700 disabled:opacity-50 transition-all"
                  >
                    <Shield className="h-4 w-4" /> Decrypt License Key
                  </ActionButton>
                )}

                {decryptError && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {decryptError}
                  </div>
                )}

                {canRelease && (
                  <ActionButton
                    name="release"
                    onClick={handleRelease}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-surface-300 py-3 font-semibold text-ink-700 hover:bg-surface-100 disabled:opacity-50 transition"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Release Funds to Seller
                  </ActionButton>
                )}

                {canDispute && (
                  <ActionButton
                    name="dispute"
                    onClick={handleDispute}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-200 py-3 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Open Dispute
                  </ActionButton>
                )}

                {canCancel && (
                  <ActionButton
                    name="cancel"
                    onClick={handleCancel}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-200 py-3 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel Listing
                  </ActionButton>
                )}

                {canResell && (
                  <button
                    onClick={() => setShowResell(!showResell)}
                    disabled={!!actionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-royal-300 py-3 font-semibold text-royal-600 hover:bg-royal-50 disabled:opacity-50 transition"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                    Resell License
                  </button>
                )}

                {isBuyer && listing.fundsReleased && alreadyResold && (
                  <div className="rounded-xl bg-surface-100 p-3 text-center text-sm text-ink-500">
                    You already have an active resale listing for this product.
                  </div>
                )}
              </div>

              {showResell && (
                <div className="mt-4 rounded-xl bg-surface-100 p-4">
                  <label className="mb-2 block text-sm font-medium text-ink-700">New Price (cUSDZ)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={resellPrice}
                      onChange={(e) => setResellPrice(e.target.value)}
                      min="0.000001"
                      step="0.000001"
                      placeholder="e.g. 20.00"
                      disabled={actionLoading === "resell"}
                      className="flex-1 rounded-xl border border-surface-300 bg-white px-4 py-2.5 text-sm text-ink-800 focus:border-royal-400 focus:outline-none disabled:opacity-50"
                    />
                    <button
                      onClick={handleResell}
                      disabled={!resellPrice || !!actionLoading}
                      className="flex items-center gap-2 rounded-xl bg-royal-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-royal-600 disabled:opacity-50 transition"
                    >
                      {actionLoading === "resell" ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        "List for Sale"
                      )}
                    </button>
                  </div>
                  {actionLoading === "resell" && (
                    <p className="mt-2 text-xs text-royal-600">Creating resale listing on-chain...</p>
                  )}
                </div>
              )}
            </div>

            {/* Decrypted License */}
            {(decryptedCode || decryptedPin) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border-2 border-green-200 bg-green-50 p-6"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <h3 className="font-bold text-green-800">Your License</h3>
                </div>

                {decryptedCode && (
                  <div className="mb-3">
                    <p className="mb-1 text-xs font-medium text-green-600">License Code</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 select-all rounded-lg bg-white px-3 py-2 font-mono text-sm text-green-800 border border-green-200">
                        {decryptedCode}
                      </code>
                      <button
                        onClick={() => copyToClipboard(decryptedCode, "code")}
                        className="rounded-lg border border-green-200 bg-white p-2 text-green-600 hover:bg-green-100 transition"
                      >
                        {copied === "code" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {decryptedPin && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-green-600">License PIN</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 select-all rounded-lg bg-white px-3 py-2 font-mono text-sm text-green-800 border border-green-200">
                        {decryptedPin}
                      </code>
                      <button
                        onClick={() => copyToClipboard(decryptedPin, "pin")}
                        className="rounded-lg border border-green-200 bg-white p-2 text-green-600 hover:bg-green-100 transition"
                      >
                        {copied === "pin" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* How it works */}
            <div className="rounded-2xl border border-surface-200 bg-white p-5">
              <h4 className="mb-3 text-sm font-semibold text-ink-700">How Buying Works</h4>
              <ol className="space-y-2">
                {[
                  "Click Buy Now — transfers cUSDZ to escrow",
                  "Reveal License — marks your key for decryption",
                  "Decrypt — FHE decrypts your code & PIN privately",
                  "Release Funds — confirms satisfaction, pays seller",
                ].map((item, i) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-ink-500">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-royal-100 text-[10px] font-bold text-royal-600">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl border border-surface-200 bg-surface-100 p-5">
              <h4 className="mb-3 text-sm font-semibold text-ink-700">Security</h4>
              <ul className="space-y-2">
                {[
                  "License key encrypted with FHE on-chain",
                  "Escrow protects your payment",
                  "3-day dispute window after purchase",
                  "Only buyer can decrypt the license",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-ink-500">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-royal-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
