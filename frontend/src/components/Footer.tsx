"use client";

import Link from "next/link";
import { Shield, Lock, Zap, Globe } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-surface-200 bg-surface-100 mt-20">
      {/* Trust bar */}
      <div className="border-b border-surface-200">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-royal-100">
                <Shield className="h-5 w-5 text-royal-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-800">FHE Protected</p>
                <p className="text-xs text-ink-500">Encrypted on-chain</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-royal-100">
                <Lock className="h-5 w-5 text-royal-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-800">Escrow System</p>
                <p className="text-xs text-ink-500">Buyer protection</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-royal-100">
                <Zap className="h-5 w-5 text-royal-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-800">Instant Delivery</p>
                <p className="text-xs text-ink-500">Decrypt immediately</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-royal-100">
                <Globe className="h-5 w-5 text-royal-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-800">Global Market</p>
                <p className="text-xs text-ink-500">Buy & sell worldwide</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <Link href="/" className="mb-4 inline-block text-xl font-bold text-ink-800">
              FHE<span className="text-royal-500">2A</span>
            </Link>
            <p className="text-sm text-ink-500">
              The first digital license marketplace powered by Fully Homomorphic Encryption.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-ink-800">Marketplace</h4>
            <ul className="space-y-2">
              <li><Link href="/marketplace" className="text-sm text-ink-500 hover:text-royal-600 transition">Browse All</Link></li>
              <li><Link href="/marketplace?category=Game" className="text-sm text-ink-500 hover:text-royal-600 transition">Games</Link></li>
              <li><Link href="/marketplace?category=Software" className="text-sm text-ink-500 hover:text-royal-600 transition">Software</Link></li>
              <li><Link href="/marketplace?category=Gift Card" className="text-sm text-ink-500 hover:text-royal-600 transition">Gift Cards</Link></li>
              <li><Link href="/marketplace?category=Subscription" className="text-sm text-ink-500 hover:text-royal-600 transition">Subscriptions</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-ink-800">Account</h4>
            <ul className="space-y-2">
              <li><Link href="/sell" className="text-sm text-ink-500 hover:text-royal-600 transition">Sell a License</Link></li>
              <li><Link href="/orders" className="text-sm text-ink-500 hover:text-royal-600 transition">My Orders</Link></li>
              <li><Link href="/wallet" className="text-sm text-ink-500 hover:text-royal-600 transition">Wallet</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-ink-800">Technology</h4>
            <ul className="space-y-2">
              <li><span className="text-sm text-ink-500">Powered by Zama FHE</span></li>
              <li><span className="text-sm text-ink-500">Ethereum Sepolia</span></li>
              <li><span className="text-sm text-ink-500">cUSDZ Payments</span></li>
              <li><span className="text-sm text-ink-500">Smart Contract Escrow</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-surface-200 pt-6 md:flex-row">
          <p className="text-xs text-ink-400">
            2024 FHE2A Marketplace. All rights reserved. Built with Zama fhEVM.
          </p>
          <div className="flex gap-6">
            <span className="text-xs text-ink-400">Privacy Policy</span>
            <span className="text-xs text-ink-400">Terms of Service</span>
            <span className="text-xs text-ink-400">Contact</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
