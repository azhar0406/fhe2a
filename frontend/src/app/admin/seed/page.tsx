"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "@/lib/contracts";
import { licenseKeyToUint256 } from "@/lib/fhe";
import { getNextListingId } from "@/lib/chain";
import { CheckCircle2, Loader2, AlertCircle, Rocket } from "lucide-react";

// Dummy license codes & pins for seeding
const SEED_LISTINGS = [
  {
    productName: "Windows 11 Pro Key",
    category: "Software",
    description: "Genuine Windows 11 Professional license key. Lifetime activation, supports 64-bit systems. Instant delivery after purchase.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Windows_11_logo.svg/400px-Windows_11_logo.svg.png",
    price: 29990000, // $29.99
    code: "WIN11-PRO-XXXX-YYYY-ZZZZ",
    pin: "1234",
  },
  {
    productName: "Steam Gift Card $50",
    category: "Gift Card",
    description: "Steam Wallet gift card worth $50 USD. Valid worldwide. Redeem on Steam for games, DLC, and in-game items.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Steam_icon_logo.svg/400px-Steam_icon_logo.svg.png",
    price: 45000000,
    code: "STEAM-GC50-ABCD-EFGH",
    pin: "5678",
  },
  {
    productName: "Adobe Creative Cloud 1 Year",
    category: "Subscription",
    description: "Adobe Creative Cloud All Apps subscription for 1 year. Access Photoshop, Illustrator, Premiere Pro, and 20+ apps.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Adobe_Creative_Cloud_rainbow_icon.svg/400px-Adobe_Creative_Cloud_rainbow_icon.svg.png",
    price: 199000000,
    code: "ADOBE-CC-2024-FULL-YEAR",
    pin: "9012",
  },
  {
    productName: "Elden Ring - Steam Key",
    category: "Game",
    description: "Elden Ring PC game key for Steam. Full base game. Global activation. Rise, Tarnished, and be guided by grace.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/b/b9/Elden_Ring_Box_art.jpg",
    price: 34990000,
    code: "ELDEN-RING-STEAM-KEY01",
    pin: "3456",
  },
  {
    productName: "Amazon Gift Card $25",
    category: "Gift Card",
    description: "Amazon gift card worth $25 USD. Redeemable on Amazon.com for millions of items. Digital delivery.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/400px-Amazon_logo.svg.png",
    price: 23500000,
    code: "AMZ-GC25-WXYZ-1234",
    pin: "7890",
  },
  {
    productName: "Microsoft 365 Family",
    category: "Software",
    description: "Microsoft 365 Family subscription, 1 year. Up to 6 users, 1TB OneDrive each. Word, Excel, PowerPoint, Outlook.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Microsoft_365_%282022%29.svg/500px-Microsoft_365_%282022%29.svg.png",
    price: 69990000,
    code: "MS365-FAM-ABCD-EFGH",
    pin: "2345",
  },
  {
    productName: "Netflix Gift Card $50",
    category: "Gift Card",
    description: "Netflix prepaid gift card. $50 USD value. Use for any Netflix subscription plan. No expiration date.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Netflix_2015_logo.svg/400px-Netflix_2015_logo.svg.png",
    price: 47000000,
    code: "NFLX-GC50-QWER-TYUI",
    pin: "6789",
  },
  {
    productName: "Cyberpunk 2077 Ultimate Edition",
    category: "Game",
    description: "Cyberpunk 2077 Ultimate Edition for GOG. Includes Phantom Liberty DLC. DRM-free, global activation.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/9/9f/Cyberpunk_2077_box_art.jpg",
    price: 39990000,
    code: "CP2077-ULT-GOG-KEY01",
    pin: "0123",
  },
  {
    productName: "Spotify Premium 12 Months",
    category: "Subscription",
    description: "Spotify Premium individual plan for 12 months. Ad-free music, offline downloads, high quality audio.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Spotify_icon.svg/400px-Spotify_icon.svg.png",
    price: 99000000,
    code: "SPOT-PREM-12MO-KEY01",
    pin: "4567",
  },
  {
    productName: "NordVPN 2 Year Plan",
    category: "Software",
    description: "NordVPN 2-year subscription key. 5500+ servers in 60 countries. Fast, secure, and private browsing.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Logo_of_NordVPN.svg/500px-Logo_of_NordVPN.svg.png",
    price: 59990000,
    code: "NORD-VPN-2YR-ABCDEF",
    pin: "8901",
  },
  {
    productName: "PlayStation Store $100",
    category: "Gift Card",
    description: "PlayStation Store gift card. $100 USD value. Buy games, DLC, PS Plus, and more on PS4/PS5.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/PlayStation_logo.svg/400px-PlayStation_logo.svg.png",
    price: 94000000,
    code: "PSN-GC100-ASDF-GHJK",
    pin: "2345",
  },
  {
    productName: "GTA V Premium - Steam Key",
    category: "Game",
    description: "Grand Theft Auto V Premium Edition for Steam. Includes Criminal Enterprise Starter Pack. Global key.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Grand_Theft_Auto_logo_series.svg/500px-Grand_Theft_Auto_logo_series.svg.png",
    price: 14990000,
    code: "GTAV-PREM-STEAM-KEY1",
    pin: "6780",
  },
];

async function encryptTwoUint256(
  val1: bigint,
  val2: bigint,
  contractAddress: string,
  userAddress: string
) {
  const { getFheInstance } = await import("@/lib/fhe");
  const instance = await getFheInstance();
  const input = instance.createEncryptedInput(contractAddress, userAddress);
  input.add256(val1);
  input.add256(val2);
  const encrypted = await input.encrypt();
  return { handles: encrypted.handles, inputProof: encrypted.inputProof };
}

export default function SeedPage() {
  const { address } = useAccount();
  const [status, setStatus] = useState<Record<number, "pending" | "encrypting" | "sending" | "done" | "error">>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [seeding, setSeeding] = useState(false);
  const [nextId, setNextId] = useState<number | null>(null);

  async function checkNextId() {
    try {
      const id = await getNextListingId();
      setNextId(id);
    } catch {
      setNextId(null);
    }
  }

  async function seedAll() {
    if (!address) return;
    setSeeding(true);

    const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
    const market = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

    for (let i = 0; i < SEED_LISTINGS.length; i++) {
      const item = SEED_LISTINGS[i];
      try {
        setStatus((s) => ({ ...s, [i]: "encrypting" }));

        const codeBigInt = licenseKeyToUint256(item.code);
        const pinBigInt = licenseKeyToUint256(item.pin);

        const { handles, inputProof } = await encryptTwoUint256(
          codeBigInt,
          pinBigInt,
          MARKETPLACE_ADDRESS,
          address
        );

        setStatus((s) => ({ ...s, [i]: "sending" }));

        const tx = await market.adminCreateListing(
          item.productName,
          item.category,
          item.description,
          item.imageUrl,
          item.price,
          0, // no expiry
          handles[0],
          handles[1],
          inputProof
        );
        await tx.wait();

        setStatus((s) => ({ ...s, [i]: "done" }));
      } catch (err: any) {
        setStatus((s) => ({ ...s, [i]: "error" }));
        setErrors((e) => ({ ...e, [i]: err?.reason || err?.message || "Failed" }));
        // Continue with next item
      }
    }

    setSeeding(false);
    checkNextId();
  }

  async function seedSingle(index: number) {
    if (!address) return;
    const item = SEED_LISTINGS[index];

    const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
    const market = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

    try {
      setStatus((s) => ({ ...s, [index]: "encrypting" }));

      const codeBigInt = licenseKeyToUint256(item.code);
      const pinBigInt = licenseKeyToUint256(item.pin);

      const { handles, inputProof } = await encryptTwoUint256(
        codeBigInt,
        pinBigInt,
        MARKETPLACE_ADDRESS,
        address
      );

      setStatus((s) => ({ ...s, [index]: "sending" }));

      const tx = await market.adminCreateListing(
        item.productName,
        item.category,
        item.description,
        item.imageUrl,
        item.price,
        0,
        handles[0],
        handles[1],
        inputProof
      );
      await tx.wait();

      setStatus((s) => ({ ...s, [index]: "done" }));
    } catch (err: any) {
      setStatus((s) => ({ ...s, [index]: "error" }));
      setErrors((e) => ({ ...e, [index]: err?.reason || err?.message || "Failed" }));
    }
  }

  const doneCount = Object.values(status).filter((s) => s === "done").length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink-800">Admin: Seed Marketplace</h1>
        <p className="mt-2 text-sm text-ink-500">
          Create all 12 dummy listings on-chain with FHE-encrypted license keys.
          You must be the contract admin (deployer) to use this.
        </p>
        <p className="mt-1 text-xs font-mono text-ink-400">
          Contract: {MARKETPLACE_ADDRESS}
        </p>
        {nextId !== null && (
          <p className="mt-1 text-xs text-ink-400">
            Next listing ID: {nextId} ({nextId - 1} listings exist)
          </p>
        )}
      </div>

      {!address && (
        <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
          Connect your admin wallet first.
        </div>
      )}

      <div className="mb-6 flex gap-3">
        <button
          onClick={seedAll}
          disabled={seeding || !address}
          className="flex items-center gap-2 rounded-xl bg-royal-500 px-6 py-3 font-semibold text-white shadow-lg shadow-royal-500/20 hover:bg-royal-600 disabled:opacity-50 transition"
        >
          <Rocket className="h-4 w-4" />
          {seeding ? `Seeding... (${doneCount}/${SEED_LISTINGS.length})` : "Seed All 12 Listings"}
        </button>
        <button
          onClick={checkNextId}
          className="rounded-xl border border-surface-300 px-4 py-3 text-sm font-medium text-ink-600 hover:bg-surface-100 transition"
        >
          Check Contract State
        </button>
      </div>

      <div className="space-y-3">
        {SEED_LISTINGS.map((item, i) => {
          const st = status[i];
          return (
            <div
              key={i}
              className={`flex items-center justify-between rounded-xl border p-4 transition ${
                st === "done"
                  ? "border-green-200 bg-green-50"
                  : st === "error"
                  ? "border-red-200 bg-red-50"
                  : "border-surface-200 bg-white"
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-ink-400">#{i + 1}</span>
                  <span className="text-sm font-semibold text-ink-800">{item.productName}</span>
                  <span className="rounded bg-surface-100 px-2 py-0.5 text-[10px] font-medium text-ink-500">
                    {item.category}
                  </span>
                  <span className="text-xs text-ink-400">
                    ${(item.price / 1e6).toFixed(2)}
                  </span>
                </div>
                {st === "error" && errors[i] && (
                  <p className="mt-1 text-xs text-red-600">{errors[i]}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {st === "encrypting" && (
                  <span className="flex items-center gap-1 text-xs text-royal-600">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Encrypting...
                  </span>
                )}
                {st === "sending" && (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending tx...
                  </span>
                )}
                {st === "done" && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
                {st === "error" && (
                  <button
                    onClick={() => seedSingle(i)}
                    disabled={seeding}
                    className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 transition"
                  >
                    Retry
                  </button>
                )}
                {!st && (
                  <button
                    onClick={() => seedSingle(i)}
                    disabled={seeding || !address}
                    className="rounded-lg border border-surface-300 px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-surface-100 disabled:opacity-40 transition"
                  >
                    Seed
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
