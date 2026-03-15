"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ListingCard } from "@/components/ListingCard";
import { getAvailableListings, getListingsByCategory, getAllCategories } from "@/lib/chain";
import { DEFAULT_CATEGORIES, type Listing, type CategoryData } from "@/types";
import { Search, SlidersHorizontal, Gamepad2, MonitorSmartphone, CreditCard, Gift, LayoutGrid } from "lucide-react";
import { ListingGridSkeleton } from "@/components/Skeleton";

const CATEGORY_ICONS: Record<string, any> = {
  Game: Gamepad2,
  Software: MonitorSmartphone,
  Subscription: CreditCard,
  "Gift Card": Gift,
  Other: LayoutGrid,
};

export default function MarketplacePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-royal-200 border-t-royal-500" />
      </div>
    }>
      <MarketplaceContent />
    </Suspense>
  );
}

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "";

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    getAllCategories()
      .then(setCategories)
      .catch(() => setCategories([...DEFAULT_CATEGORIES]));
  }, []);

  useEffect(() => {
    fetchListings();
  }, [category]);

  async function fetchListings() {
    setLoading(true);
    try {
      let data: Listing[];
      if (category) {
        data = await getListingsByCategory(category);
      } else {
        data = await getAvailableListings();
      }

      // Client-side search filter
      if (search) {
        const q = search.toLowerCase();
        data = data.filter(
          (l) =>
            l.productName.toLowerCase().includes(q) ||
            l.description.toLowerCase().includes(q)
        );
      }

      setListings(data);
    } catch (err) {
      console.error("Failed to fetch listings from chain:", err);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchListings();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink-800">
          {category || "All"} Licenses
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Browse FHE-encrypted digital license keys — live from Sepolia
        </p>
      </div>

      {/* Search & Filters */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search games, software, gift cards..."
              className="w-full rounded-xl border border-surface-300 bg-white py-3 pl-10 pr-4 text-sm text-ink-800 placeholder-ink-400 focus:border-royal-400 focus:outline-none focus:ring-2 focus:ring-royal-100 transition"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-royal-500 px-6 py-3 text-sm font-semibold text-white hover:bg-royal-600 transition"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </form>
      </div>

      {/* Category pills */}
      <div className="mb-8 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory("")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            !category
              ? "bg-royal-500 text-white shadow-md shadow-royal-500/20"
              : "border border-surface-300 bg-white text-ink-600 hover:border-royal-300 hover:text-royal-600"
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          All
        </button>
        {(categories.length > 0 ? categories : [...DEFAULT_CATEGORIES]).map((catName) => {
          const Icon = CATEGORY_ICONS[catName] || LayoutGrid;
          return (
            <button
              key={catName}
              onClick={() => setCategory(catName)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                category === catName
                  ? "bg-royal-500 text-white shadow-md shadow-royal-500/20"
                  : "border border-surface-300 bg-white text-ink-600 hover:border-royal-300 hover:text-royal-600"
              }`}
            >
              <Icon className="h-4 w-4" />
              {catName}
            </button>
          );
        })}
      </div>

      {/* Results */}
      {loading ? (
        <ListingGridSkeleton count={8} />
      ) : listings.length === 0 ? (
        <div className="rounded-2xl border border-surface-200 bg-surface-100 p-16 text-center">
          <SlidersHorizontal className="mx-auto mb-4 h-12 w-12 text-surface-300" />
          <h3 className="mb-2 text-lg font-semibold text-ink-700">No listings found</h3>
          <p className="text-sm text-ink-500">No active listings on-chain yet. Try seeding data from the admin page.</p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-ink-500">{listings.length} result{listings.length !== 1 ? "s" : ""}</p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing, i) => (
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
        </>
      )}
    </div>
  );
}
