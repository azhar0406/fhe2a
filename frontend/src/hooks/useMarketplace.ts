"use client";

import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import {
  MARKETPLACE_ABI, CUSDZ_ABI, USDZ_ABI,
  MARKETPLACE_ADDRESS, CUSDZ_ADDRESS, USDZ_ADDRESS,
} from "@/lib/contracts";
import { encryptUint64, encryptUint256, licenseKeyToUint256 } from "@/lib/fhe";

function getSigner() {
  if (typeof window === "undefined" || !window.ethereum) return null;
  return new ethers.BrowserProvider(window.ethereum).getSigner();
}

export function useMarketplace() {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wrap = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Create Listing ──────────────────────────────────────────
  const createListing = useCallback(
    async (
      productName: string, category: string, description: string,
      imageUrl: string, price: bigint, expiryDate: number,
      licenseCode: string, licensePin: string
    ) => wrap(async () => {
      if (!address) throw new Error("Wallet not connected");
      const signer = await getSigner();
      if (!signer) throw new Error("No signer");
      const market = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      const codeBigInt = licenseKeyToUint256(licenseCode);
      const pinBigInt = licenseKeyToUint256(licensePin);

      // Encrypt code and pin together (shared proof)
      const { handles, inputProof } = await encryptTwoUint256(
        codeBigInt, pinBigInt, MARKETPLACE_ADDRESS, address
      );

      const tx = await market.createListing(
        productName, category, description, imageUrl,
        price, expiryDate, handles[0], handles[1], inputProof
      );
      return await tx.wait();
    }),
    [address, wrap]
  );

  // ── Buy License ─────────────────────────────────────────────
  // Uses purchaseOnBehalf — marketplace handles cUSDZ transfer via operator permissions
  const buyLicense = useCallback(
    async (listingId: number, _price?: bigint) => wrap(async () => {
      if (!address) throw new Error("Wallet not connected");
      const signer = await getSigner();
      if (!signer) throw new Error("No signer");
      const market = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
      const cUsdz = new ethers.Contract(CUSDZ_ADDRESS, CUSDZ_ABI, signer);

      // Ensure marketplace is set as operator on cUSDZ (required for transfer)
      const isOp = await cUsdz.isOperator(address, MARKETPLACE_ADDRESS);
      if (!isOp) {
        const maxDeadline = (1n << 48n) - 1n;
        await (await cUsdz.setOperator(MARKETPLACE_ADDRESS, maxDeadline)).wait();
      }

      return await (await market.purchaseOnBehalf(address, listingId)).wait();
    }),
    [address, wrap]
  );

  // ── Reveal License ──────────────────────────────────────────
  const revealLicense = useCallback(
    async (listingId: number) => wrap(async () => {
      if (!address) throw new Error("Wallet not connected");
      const signer = await getSigner();
      if (!signer) throw new Error("No signer");
      const market = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
      return await (await market.revealLicense(listingId)).wait();
    }),
    [address, wrap]
  );

  // ── Cancel Listing ──────────────────────────────────────────
  const cancelListing = useCallback(
    async (listingId: number) => wrap(async () => {
      if (!address) throw new Error("Wallet not connected");
      const signer = await getSigner();
      if (!signer) throw new Error("No signer");
      const market = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
      return await (await market.cancelListing(listingId)).wait();
    }),
    [address, wrap]
  );

  // ── Release Funds ───────────────────────────────────────────
  const releaseFunds = useCallback(
    async (listingId: number) => wrap(async () => {
      if (!address) throw new Error("Wallet not connected");
      const signer = await getSigner();
      if (!signer) throw new Error("No signer");
      const market = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
      return await (await market.releaseFunds(listingId)).wait();
    }),
    [address, wrap]
  );

  // ── Open Dispute ────────────────────────────────────────────
  const openDispute = useCallback(
    async (listingId: number) => wrap(async () => {
      if (!address) throw new Error("Wallet not connected");
      const signer = await getSigner();
      if (!signer) throw new Error("No signer");
      const market = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
      return await (await market.openDispute(listingId)).wait();
    }),
    [address, wrap]
  );

  // ── Resell ──────────────────────────────────────────────────
  const resellLicense = useCallback(
    async (originalId: number, newPrice: bigint) => wrap(async () => {
      if (!address) throw new Error("Wallet not connected");
      const signer = await getSigner();
      if (!signer) throw new Error("No signer");
      const market = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
      return await (await market.resellLicense(originalId, newPrice)).wait();
    }),
    [address, wrap]
  );

  // ── Mint USDZ (faucet) ─────────────────────────────────────
  const mintUsdz = useCallback(
    async () => wrap(async () => {
      if (!address) throw new Error("Wallet not connected");
      const signer = await getSigner();
      if (!signer) throw new Error("No signer");
      const usdz = new ethers.Contract(USDZ_ADDRESS, USDZ_ABI, signer);
      return await (await usdz.mint(address)).wait();
    }),
    [address, wrap]
  );

  // ── Wrap USDZ → cUSDZ ──────────────────────────────────────
  const wrapUsdz = useCallback(
    async (amount: bigint) => wrap(async () => {
      if (!address) throw new Error("Wallet not connected");
      const signer = await getSigner();
      if (!signer) throw new Error("No signer");
      const usdz = new ethers.Contract(USDZ_ADDRESS, USDZ_ABI, signer);
      const cUsdz = new ethers.Contract(CUSDZ_ADDRESS, CUSDZ_ABI, signer);
      await (await usdz.approve(CUSDZ_ADDRESS, amount)).wait();
      return await (await cUsdz.wrap(address, amount)).wait();
    }),
    [address, wrap]
  );

  return {
    createListing, buyLicense, revealLicense, cancelListing,
    releaseFunds, openDispute, resellLicense, mintUsdz, wrapUsdz,
    loading, error,
  };
}

// Helper: encrypt two uint256 values with shared proof
async function encryptTwoUint256(
  val1: bigint, val2: bigint, contractAddress: string, userAddress: string
) {
  const { getFheInstance } = await import("@/lib/fhe");
  const instance = await getFheInstance();
  const input = instance.createEncryptedInput(contractAddress, userAddress);
  input.add256(val1);
  input.add256(val2);
  const encrypted = await input.encrypt();
  return { handles: encrypted.handles, inputProof: encrypted.inputProof };
}
