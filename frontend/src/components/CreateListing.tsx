"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useMarketplace } from "@/hooks/useMarketplace";
import { api } from "@/lib/api";
import { DEFAULT_CATEGORIES, type CategoryData } from "@/types";
import { CheckCircle2, AlertCircle, Lock, ImageIcon } from "lucide-react";

export function CreateListing() {
  const { isConnected } = useAccount();
  const { createListing, loading, error } = useMarketplace();

  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [licenseCode, setLicenseCode] = useState("");
  const [licensePin, setLicensePin] = useState("");
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<CategoryData[]>([]);

  useEffect(() => {
    api.getCategories()
      .then((res) => {
        const active = res.data.filter((c: CategoryData) => c.active);
        setCategories(active);
        if (active.length > 0 && !category) setCategory(active[0].name);
      })
      .catch(() => {
        setCategories(DEFAULT_CATEGORIES.map((name) => ({ name, count: 0, threshold: 0, active: true })));
        if (!category) setCategory(DEFAULT_CATEGORIES[0]);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);

    const priceInUnits = BigInt(Math.round(parseFloat(price) * 1e6));
    const expiry = expiryDate ? Math.floor(new Date(expiryDate).getTime() / 1000) : 0;

    await createListing(
      productName, category, description, imageUrl,
      priceInUnits, expiry, licenseCode, licensePin
    );
    setSuccess(true);
    setProductName("");
    setDescription("");
    setImageUrl("");
    setPrice("");
    setExpiryDate("");
    setLicenseCode("");
    setLicensePin("");
  }

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-surface-200 bg-surface-100 p-10 text-center">
        <Lock className="mx-auto mb-3 h-10 w-10 text-surface-400" />
        <p className="font-medium text-ink-600">Connect your wallet to list a license for sale.</p>
      </div>
    );
  }

  const inputClass = "w-full rounded-xl border border-surface-300 bg-white px-4 py-2.5 text-sm text-ink-800 placeholder-ink-400 focus:border-royal-400 focus:outline-none focus:ring-2 focus:ring-royal-100 transition";
  const labelClass = "mb-1.5 block text-sm font-medium text-ink-700";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className={labelClass}>Product Name</label>
        <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
          required placeholder="e.g. Windows 11 Pro Key" className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className={inputClass}>
          {categories.map((cat) => (
            <option key={cat.name} value={cat.name}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          required rows={3} placeholder="Describe the license (region, platform, etc.)"
          className={`${inputClass} resize-none`} />
      </div>

      <div>
        <label className={labelClass}>
          <span className="flex items-center gap-1.5">
            <ImageIcon className="h-4 w-4 text-ink-400" />
            Image URL
          </span>
        </label>
        <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/product-image.png" className={inputClass} />
        <p className="mt-1 text-xs text-ink-400">Optional product image URL.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Price (cUSDZ)</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
            required min="0.000001" step="0.000001" placeholder="e.g. 25.00" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Expiry Date</label>
          <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
            className={inputClass} />
          <p className="mt-1 text-xs text-ink-400">Optional</p>
        </div>
      </div>

      <div className="rounded-xl border border-royal-100 bg-royal-50/50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Lock className="h-4 w-4 text-royal-500" />
          <span className="text-sm font-semibold text-royal-700">Encrypted License Data</span>
        </div>
        <p className="mb-4 text-xs text-royal-600">
          These values will be encrypted with FHE before being stored on-chain. Only the buyer can decrypt them after purchase.
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-royal-700">License Code</label>
            <input type="text" value={licenseCode} onChange={(e) => setLicenseCode(e.target.value)}
              required maxLength={32} placeholder="e.g. XXXXX-XXXXX-XXXXX-XXXXX"
              className={`${inputClass} font-mono`} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-royal-700">License PIN</label>
            <input type="text" value={licensePin} onChange={(e) => setLicensePin(e.target.value)}
              required maxLength={32} placeholder="e.g. 1234-5678"
              className={`${inputClass} font-mono`} />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Listing created successfully!
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-royal-500 py-3.5 font-semibold text-white shadow-lg shadow-royal-500/20 hover:bg-royal-600 disabled:opacity-50 transition-all"
      >
        {loading ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Encrypting & Listing...
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            Create Listing
          </>
        )}
      </button>
    </form>
  );
}
