"use client";

import Link from "next/link";
import { Listing, STATUS_LABELS, ListingStatus } from "@/types";
import { ProductImage } from "@/components/ProductImage";
import { Eye } from "lucide-react";

interface ListingCardProps {
  listing: Listing;
}

const CATEGORY_STYLES: Record<string, string> = {
  Game: "bg-purple-50 text-purple-600",
  Software: "bg-blue-50 text-blue-600",
  Subscription: "bg-emerald-50 text-emerald-600",
  "Gift Card": "bg-amber-50 text-amber-600",
  Other: "bg-gray-50 text-gray-600",
};

export function ListingCard({ listing }: ListingCardProps) {
  const priceFormatted = (Number(listing.price) / 1e6).toFixed(2);
  const categoryStyle = CATEGORY_STYLES[listing.category] || CATEGORY_STYLES.Other;
  const isResale = listing.description.startsWith("[Resale]");

  return (
    <Link href={`/listing/${listing.id}`}>
      <div className="card-lift group overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-card hover:shadow-card-hover transition-all">
        {/* Image with blur placeholder + fallback */}
        <div className="relative h-44 w-full">
          <ProductImage
            src={listing.imageUrl}
            alt={listing.productName}
            category={listing.category}
            className="h-full w-full transition-transform duration-300 group-hover:scale-105"
          />

          {/* Status overlay for non-active */}
          {listing.status !== ListingStatus.Active && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink-900/40">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-800">
                {STATUS_LABELS[listing.status]}
              </span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute left-3 top-3 flex gap-1.5">
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm ${categoryStyle}`}>
              {listing.category}
            </span>
            {isResale && (
              <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600 backdrop-blur-sm">
                Resale
              </span>
            )}
          </div>

          {listing.isRevealed && (
            <div className="absolute right-3 top-3">
              <span className="flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-600 backdrop-blur-sm">
                <Eye className="h-3 w-3" /> Revealed
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="mb-1 text-sm font-semibold text-ink-800 line-clamp-1 group-hover:text-royal-600 transition">
            {listing.productName}
          </h3>
          <p className="mb-3 text-xs text-ink-500 line-clamp-2">{listing.description}</p>

          <div className="flex items-end justify-between">
            <div>
              <span className="text-xl font-bold text-ink-900">{priceFormatted}</span>
              <span className="ml-1 text-xs font-medium text-ink-400">cUSDZ</span>
            </div>
            <div className="text-[10px] text-ink-400">
              by {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
