"use client";

/** Base skeleton shimmer block */
function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-surface-200 ${className}`}>
      <div className="h-full w-full rounded-lg bg-gradient-to-r from-surface-200 via-surface-150 to-surface-200 skeleton-shimmer" />
    </div>
  );
}

/** Skeleton for a listing card */
export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-surface-200 bg-white">
      {/* Image placeholder */}
      <SkeletonBlock className="h-44 w-full rounded-none" />
      {/* Content */}
      <div className="p-4 space-y-3">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-2/3" />
        <div className="flex items-end justify-between pt-2">
          <SkeletonBlock className="h-7 w-24" />
          <SkeletonBlock className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

/** Grid of skeleton cards */
export function ListingGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton for product detail page */
export function ListingDetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <SkeletonBlock className="mb-6 h-4 w-40" />
      <div className="grid gap-8 lg:grid-cols-5">
        {/* Left */}
        <div className="lg:col-span-3 space-y-6">
          <SkeletonBlock className="h-80 w-full rounded-2xl lg:h-96" />
          <div className="rounded-2xl border border-surface-200 bg-white p-6 space-y-3">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-5/6" />
            <SkeletonBlock className="h-3 w-4/6" />
          </div>
        </div>
        {/* Right */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-surface-200 bg-white p-6 space-y-4">
            <div className="flex justify-between">
              <SkeletonBlock className="h-6 w-20" />
              <SkeletonBlock className="h-6 w-16" />
            </div>
            <SkeletonBlock className="h-8 w-3/4" />
            <SkeletonBlock className="h-6 w-1/2" />
            <SkeletonBlock className="h-16 w-full rounded-xl" />
            <SkeletonBlock className="h-12 w-full rounded-xl" />
          </div>
          <div className="rounded-2xl border border-surface-200 bg-surface-100 p-5 space-y-3">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-5/6" />
            <SkeletonBlock className="h-3 w-4/6" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton for category pills */
export function CategoryPillsSkeleton() {
  return (
    <div className="flex gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonBlock key={i} className="h-10 w-28 rounded-xl" />
      ))}
    </div>
  );
}

export { SkeletonBlock };
