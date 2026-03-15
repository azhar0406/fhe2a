"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectKitButton } from "connectkit";
import { useAccount } from "wagmi";
import { Menu, X, ShoppingBag, Package, Gamepad2, MonitorSmartphone, CreditCard, Gift, Droplets } from "lucide-react";
import { FaucetModal } from "./FaucetModal";

const NAV_LINKS = [
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/orders", label: "My Orders", icon: Package },
];

const CATEGORY_LINKS = [
  { href: "/marketplace?category=Game", label: "Gaming", icon: Gamepad2 },
  { href: "/marketplace?category=Software", label: "Software", icon: MonitorSmartphone },
  { href: "/marketplace?category=Subscription", label: "Subscriptions", icon: CreditCard },
  { href: "/marketplace?category=Gift Card", label: "Gift Cards", icon: Gift },
];

export function Navbar() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [faucetOpen, setFaucetOpen] = useState(false);

  return (
    <>
    <header className="sticky top-0 z-50">
      {/* Main nav */}
      <nav className="glass border-b border-surface-200 shadow-nav">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-royal-500">
                <span className="text-sm font-bold text-white">F</span>
              </div>
              <span className="text-xl font-bold text-ink-800">
                FHE<span className="text-royal-500">2A</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden items-center gap-1 md:flex">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-royal-50 text-royal-600"
                        : "text-ink-600 hover:bg-surface-100 hover:text-ink-800"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Faucet button */}
            <button
              onClick={() => setFaucetOpen(true)}
              disabled={!isConnected}
              className="hidden items-center gap-1.5 rounded-lg border-2 border-royal-300 bg-royal-50 px-4 py-2 text-sm font-semibold text-royal-600 hover:bg-royal-100 hover:border-royal-400 disabled:opacity-40 transition sm:flex"
            >
              <Droplets className="h-4 w-4" />
              Faucet
            </button>

            {/* Connect Wallet */}
            <ConnectKitButton.Custom>
              {({ isConnected, show, truncatedAddress, ensName }) => (
                <button
                  onClick={show}
                  className="rounded-lg bg-royal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-royal-500/20 hover:bg-royal-600 transition"
                >
                  {isConnected ? ensName ?? truncatedAddress : "Connect Wallet"}
                </button>
              )}
            </ConnectKitButton.Custom>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-lg p-2 text-ink-600 hover:bg-surface-100 md:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-surface-200 bg-white px-4 py-3 md:hidden">
            <div className="space-y-1">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-surface-100"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
              {isConnected && (
                <button
                  onClick={() => { setFaucetOpen(true); setMobileOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-royal-600 hover:bg-royal-50"
                >
                  <Droplets className="h-4 w-4" />
                  Faucet
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Category bar */}
      <div className="border-b border-surface-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl overflow-x-auto px-4">
          <div className="flex items-center gap-1 py-2">
            {CATEGORY_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-surface-100 hover:text-royal-600 transition"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
            <Link
              href="/marketplace"
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-ink-500 hover:bg-surface-100 hover:text-royal-600 transition"
            >
              All Categories
            </Link>
          </div>
        </div>
      </div>
    </header>

    <FaucetModal open={faucetOpen} onClose={() => setFaucetOpen(false)} />
    </>
  );
}
