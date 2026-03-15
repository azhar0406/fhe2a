"use client";

import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { userDecryptBatch, uint256ToLicenseKey } from "@/lib/fhe";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "@/lib/contracts";

/**
 * Hook for revealing and decrypting license code + pin from purchased listings.
 */
export function useFHE() {
  const { address } = useAccount();
  const [decrypting, setDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decryptLicense = useCallback(
    async (listingId: number): Promise<{ code: string; pin: string }> => {
      if (!address) throw new Error("Wallet not connected");
      if (!window.ethereum) throw new Error("No wallet provider");

      setDecrypting(true);
      setError(null);

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // Get the revealed listing with encrypted handles (needs signer — contract checks msg.sender == buyer)
        const market = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
        console.log("[useFHE] Fetching revealed listing", listingId);
        const revealed = await market.getRevealedListing(listingId);
        console.log("[useFHE] Revealed listing fetched:", {
          id: revealed.id?.toString(),
          isRevealed: revealed.isRevealed,
          encCode: revealed.encryptedCode?.toString(),
          encPin: revealed.encryptedPin?.toString(),
        });

        // Convert BigInt handles to 0x-prefixed hex (64 chars, zero-padded) — Zama SDK expects hex
        const encCodeHandle = "0x" + revealed.encryptedCode.toString(16).padStart(64, "0");
        const encPinHandle = "0x" + revealed.encryptedPin.toString(16).padStart(64, "0");

        if (encCodeHandle === "0x" + "0".repeat(64) || encPinHandle === "0x" + "0".repeat(64)) {
          throw new Error("License not revealed yet — reveal first before decrypting");
        }

        // Decrypt both in one batch (single MetaMask signature)
        console.log("[useFHE] Starting FHE decryption, MetaMask will request signature...");
        const [codeDecrypted, pinDecrypted] = await userDecryptBatch(
          [encCodeHandle, encPinHandle],
          MARKETPLACE_ADDRESS,
          signer
        );
        console.log("[useFHE] Decryption complete");

        return {
          code: uint256ToLicenseKey(codeDecrypted),
          pin: uint256ToLicenseKey(pinDecrypted),
        };
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setDecrypting(false);
      }
    },
    [address]
  );

  return { decryptLicense, decrypting, error };
}
