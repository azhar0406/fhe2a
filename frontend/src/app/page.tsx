"use client";

import { Suspense, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield, Lock, Zap, ArrowRight, TrendingUp, Users, ShoppingCart,
  Gamepad2, MonitorSmartphone, CreditCard, Gift, Star, CheckCircle2,
  ChevronRight, Clock
} from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import { getAvailableListings } from "@/lib/chain";
import { PLATFORM_STATS, TRUST_STATS } from "@/lib/dummyData";
import type { Listing } from "@/types";

const HeroScene = dynamic(
  () => import("@/components/HeroScene").then(m => ({ default: m.HeroScene })),
  { ssr: false }
);

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const CATEGORIES = [
  { name: "Gaming", icon: Gamepad2, color: "bg-purple-50 text-purple-600 border-purple-100", count: "4,200+" },
  { name: "Software", icon: MonitorSmartphone, color: "bg-blue-50 text-blue-600 border-blue-100", count: "3,800+" },
  { name: "Subscriptions", icon: CreditCard, color: "bg-emerald-50 text-emerald-600 border-emerald-100", count: "2,100+" },
  { name: "Gift Cards", icon: Gift, color: "bg-amber-50 text-amber-600 border-amber-100", count: "5,700+" },
];

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    getAvailableListings()
      .then(setListings)
      .catch(() => setListings([]));
  }, []);

  const featuredListings = listings.slice(0, 4);
  const bestSellers = listings.slice(4, 8);
  const deals = listings.slice(8, 12);

  return (
    <div>
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-surface-100 via-white to-royal-50">
        <Suspense fallback={null}>
          <HeroScene />
        </Suspense>

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-16 md:pb-28 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-royal-200 bg-royal-50 px-4 py-1.5">
                <Shield className="h-4 w-4 text-royal-500" />
                <span className="text-xs font-semibold text-royal-700">Powered by Zama FHE</span>
              </div>
            </motion.div>

            <motion.h1
              className="mb-6 text-4xl font-extrabold tracking-tight text-ink-900 md:text-6xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Digital Licenses,{" "}
              <span className="text-gradient">Encrypted</span>
              <br />
              On-Chain
            </motion.h1>

            <motion.p
              className="mb-8 text-lg text-ink-600 md:text-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Buy and sell game keys, software licenses, gift cards & subscriptions with{" "}
              <span className="font-semibold text-ink-800">
                fully homomorphic encryption
              </span>
              . Your keys stay private. Always.
            </motion.p>

            <motion.div
              className="flex flex-col items-center justify-center gap-3 sm:flex-row"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Link
                href="/marketplace"
                className="group flex items-center gap-2 rounded-xl bg-royal-500 px-8 py-3.5 font-semibold text-white shadow-lg shadow-royal-500/25 hover:bg-royal-600 hover:shadow-royal-500/30 transition-all"
              >
                Browse Marketplace
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
              <Link
                href="/sell"
                className="flex items-center gap-2 rounded-xl border-2 border-surface-300 bg-white px-8 py-3.5 font-semibold text-ink-700 hover:border-royal-300 hover:text-royal-600 transition-all"
              >
                Start Selling
              </Link>
            </motion.div>
          </div>

          {/* Stats bar */}
          <motion.div
            className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {[
              { label: "Active Listings", value: PLATFORM_STATS.totalListings.toLocaleString(), icon: ShoppingCart },
              { label: "Licenses Sold", value: PLATFORM_STATS.totalSold.toLocaleString(), icon: TrendingUp },
              { label: "Active Users", value: PLATFORM_STATS.activeUsers.toLocaleString(), icon: Users },
              { label: "Total Volume", value: PLATFORM_STATS.totalVolume, icon: TrendingUp },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="rounded-xl border border-surface-200 bg-white/80 backdrop-blur-sm p-4 text-center shadow-card"
              >
                <p className="text-2xl font-bold text-ink-800">{stat.value}</p>
                <p className="text-xs font-medium text-ink-500">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ CATEGORIES ═══ */}
      <section className="border-b border-surface-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-ink-800">Browse by Category</h2>
            <Link href="/marketplace" className="flex items-center gap-1 text-sm font-medium text-royal-500 hover:text-royal-600 transition">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <Link
                  href={`/marketplace?category=${cat.name === "Gaming" ? "Game" : cat.name === "Gift Cards" ? "Gift Card" : cat.name === "Subscriptions" ? "Subscription" : cat.name}`}
                  className={`card-lift group flex flex-col items-center rounded-2xl border p-6 text-center shadow-card hover:shadow-card-hover transition-all ${cat.color}`}
                >
                  <cat.icon className="mb-3 h-10 w-10" />
                  <h3 className="text-base font-semibold">{cat.name}</h3>
                  <p className="mt-1 text-xs opacity-70">{cat.count} items</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURED LISTINGS ═══ */}
      <section className="bg-surface-100 py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-ink-800">Featured Deals</h2>
              <p className="mt-1 text-sm text-ink-500">Hand-picked best prices on popular licenses</p>
            </div>
            <Link href="/marketplace" className="flex items-center gap-1 rounded-lg bg-royal-50 px-4 py-2 text-sm font-medium text-royal-600 hover:bg-royal-100 transition">
              See more <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredListings.map((listing, i) => (
              <motion.div
                key={listing.id}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <ListingCard listing={listing} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-ink-800">How It Works</h2>
            <p className="mt-2 text-ink-500">Buy encrypted licenses in 3 simple steps</p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Connect & Browse",
                desc: "Connect your wallet and browse thousands of digital licenses across games, software, subscriptions and more.",
                icon: ShoppingCart,
              },
              {
                step: "02",
                title: "Buy with cUSDZ",
                desc: "Pay securely using cUSDZ (confidential stablecoin). Your payment amount is encrypted on-chain via FHE.",
                icon: Lock,
              },
              {
                step: "03",
                title: "Reveal & Use",
                desc: "After purchase, reveal and decrypt your license key. Only you can see it thanks to homomorphic encryption.",
                icon: Zap,
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="relative rounded-2xl border border-surface-200 bg-surface-100 p-8"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-royal-500 shadow-lg shadow-royal-500/20">
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-4xl font-extrabold text-surface-200">{item.step}</span>
                </div>
                <h3 className="mb-2 text-lg font-bold text-ink-800">{item.title}</h3>
                <p className="text-sm text-ink-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BEST SELLERS ═══ */}
      <section className="border-t border-surface-200 bg-surface-100 py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-ink-800">Bestsellers</h2>
              <p className="mt-1 text-sm text-ink-500">Most popular licenses this week</p>
            </div>
            <Link href="/marketplace" className="flex items-center gap-1 text-sm font-medium text-royal-500 hover:text-royal-600 transition">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {bestSellers.map((listing, i) => (
              <motion.div
                key={listing.id}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <ListingCard listing={listing} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TRUST & SECURITY ═══ */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="rounded-3xl bg-gradient-to-br from-royal-500 to-royal-700 p-10 md:p-16">
            <div className="grid gap-10 md:grid-cols-2 md:items-center">
              <div>
                <h2 className="mb-4 text-3xl font-bold text-white">
                  Privacy-First Marketplace
                </h2>
                <p className="mb-6 text-royal-100 leading-relaxed">
                  Unlike traditional marketplaces, FHE2A uses Fully Homomorphic Encryption to keep
                  your license keys encrypted even while stored on-chain. No one — not even validators
                  or the platform — can read your keys.
                </p>
                <ul className="space-y-3">
                  {[
                    "License keys encrypted with FHE (euint256)",
                    "Payment amounts are confidential (cUSDZ)",
                    "Smart contract escrow protects both parties",
                    "3-day dispute window for buyer protection",
                    "Seller reputation & trust scoring",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-white">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-royal-200" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Satisfaction", value: TRUST_STATS.satisfaction, icon: Star },
                  { label: "Avg Delivery", value: TRUST_STATS.avgDelivery, icon: Clock },
                  { label: "Dispute Rate", value: TRUST_STATS.disputes, icon: Shield },
                  { label: "Uptime", value: TRUST_STATS.uptime, icon: Zap },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-white/10 backdrop-blur-sm p-5 text-center">
                    <stat.icon className="mx-auto mb-2 h-6 w-6 text-royal-200" />
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-royal-200">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ MORE DEALS ═══ */}
      <section className="bg-surface-100 py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-ink-800">Top Software Deals</h2>
              <p className="mt-1 text-sm text-ink-500">Premium software at unbeatable prices</p>
            </div>
            <Link href="/marketplace?category=Software" className="flex items-center gap-1 text-sm font-medium text-royal-500 hover:text-royal-600 transition">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {deals.map((listing, i) => (
              <motion.div
                key={listing.id}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <ListingCard listing={listing} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-ink-800">
            Ready to Start Selling?
          </h2>
          <p className="mb-8 text-ink-500">
            List your digital licenses in minutes. FHE encryption keeps your keys safe.
            Earn cUSDZ for every sale.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/sell"
              className="group flex items-center gap-2 rounded-xl bg-royal-500 px-8 py-3.5 font-semibold text-white shadow-lg shadow-royal-500/25 hover:bg-royal-600 transition-all"
            >
              List Your First License
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
            <Link
              href="/marketplace"
              className="rounded-xl border-2 border-surface-300 px-8 py-3.5 font-semibold text-ink-700 hover:border-royal-300 hover:text-royal-600 transition-all"
            >
              Explore Marketplace
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
