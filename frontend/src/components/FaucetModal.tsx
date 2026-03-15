"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { X, Droplets, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Wallet, RefreshCw, Eye, EyeOff, Lock } from "lucide-react";
import { USDZ_ADDRESS, USDZ_ABI, CUSDZ_ADDRESS, CUSDZ_ABI } from "@/lib/contracts";

function getSigner() {
  if (typeof window === "undefined" || !window.ethereum) return null;
  return new ethers.BrowserProvider(window.ethereum).getSigner();
}

interface FaucetModalProps {
  open: boolean;
  onClose: () => void;
}

// Calculate cUSDZ balance from on-chain events.
// Wraps: USDZ Transfer(user → cUSDZ) matched with ConfidentialTransfer(0x0 → user) in same block
// Unwraps: USDZ Transfer(cUSDZ → user)
async function calcCusdzBalance(address: string, provider: ethers.Provider): Promise<number> {
  const blockNumber = await provider.getBlockNumber();
  const fromBlock = Math.max(0, blockNumber - 49000);

  const usdz = new ethers.Contract(USDZ_ADDRESS, [
    "event Transfer(address indexed from, address indexed to, uint256 value)",
  ], provider);

  const cusdz = new ethers.Contract(CUSDZ_ADDRESS, [
    "event ConfidentialTransfer(address indexed from, address indexed to, bytes32 amount)",
  ], provider);

  // USDZ transfers from user to cUSDZ contract (wraps)
  const usdzWraps = await usdz.queryFilter(
    usdz.filters.Transfer(address, CUSDZ_ADDRESS), fromBlock, blockNumber
  );

  // ConfidentialTransfer mints (0x0 → user) = successful wraps to user
  const cusdzMints = await cusdz.queryFilter(
    cusdz.filters.ConfidentialTransfer(ethers.ZeroAddress, address), fromBlock, blockNumber
  );

  // Only count USDZ wraps where cUSDZ actually went to the user (same block)
  const mintBlocks = new Set(cusdzMints.map(e => e.blockNumber));
  let totalWrapped = 0;
  for (const e of usdzWraps) {
    if (mintBlocks.has(e.blockNumber)) {
      totalWrapped += Number((e as any).args[2]) / 1e6;
    }
  }

  // USDZ transfers from cUSDZ to user (unwraps)
  const usdzUnwraps = await usdz.queryFilter(
    usdz.filters.Transfer(CUSDZ_ADDRESS, address), fromBlock, blockNumber
  );
  let totalUnwrapped = 0;
  for (const e of usdzUnwraps) {
    totalUnwrapped += Number((e as any).args[2]) / 1e6;
  }

  return totalWrapped - totalUnwrapped;
}

export function FaucetModal({ open, onClose }: FaucetModalProps) {
  const { address } = useAccount();
  const [usdzBalance, setUsdzBalance] = useState<string | null>(null);
  const [cusdzBalance, setCusdzBalance] = useState<string | null>(null);
  const [cusdzRevealed, setCusdzRevealed] = useState(false);
  const [mintAmount, setMintAmount] = useState(10);
  const [wrapAmount, setWrapAmount] = useState("");
  const [unwrapAmount, setUnwrapAmount] = useState("");
  const [showUnwrap, setShowUnwrap] = useState(false);
  const [step, setStep] = useState<"idle" | "minting" | "approving" | "wrapping" | "unwrapping" | "revealing">("idle");
  const [mintProgress, setMintProgress] = useState(0);
  const [totalMints, setTotalMints] = useState(0);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastTxProvider = useRef<ethers.Provider | null>(null);

  // Reset revealed state when modal closes
  useEffect(() => {
    if (!open) {
      setCusdzRevealed(false);
      setCusdzBalance(null);
    }
  }, [open]);

  // Fetch USDZ balance only (cUSDZ stays hidden until eye click)
  const fetchUsdzBalance = useCallback(async (provider?: ethers.Provider) => {
    if (!address) return;
    try {
      const p = provider || lastTxProvider.current || new ethers.BrowserProvider(window.ethereum);
      const usdz = new ethers.Contract(USDZ_ADDRESS, USDZ_ABI, p);
      const bal = await usdz.balanceOf(address);
      setUsdzBalance((Number(bal) / 1e6).toFixed(2));
    } catch {
      setUsdzBalance(null);
    }
  }, [address]);

  useEffect(() => {
    if (open && address) fetchUsdzBalance();
  }, [open, address, fetchUsdzBalance]);

  // Reveal cUSDZ balance: MetaMask signature → on-chain event scan → show balance
  async function handleRevealBalance() {
    if (!address) return;
    setError(null);
    setStep("revealing");

    try {
      const signer = await getSigner();
      if (!signer) throw new Error("No signer");

      // Request MetaMask signature to authenticate the balance reveal
      const message = `Reveal cUSDZ balance for ${address}\nTimestamp: ${Date.now()}`;
      await signer.signMessage(message);

      // After signing, calculate balance from on-chain events
      const provider = signer.provider;
      const balance = await calcCusdzBalance(address, provider);
      const balStr = Math.max(0, balance).toFixed(2);

      setCusdzBalance(balStr);
      setCusdzRevealed(true);
      setStep("idle");
    } catch (err: any) {
      if (err?.code === "ACTION_REJECTED" || err?.code === 4001) {
        // User rejected the signature — just go back to idle
        setStep("idle");
        return;
      }
      setError(err?.reason || err?.message || "Failed to reveal balance");
      setStep("idle");
    }
  }

  // Hide balance again
  function handleHideBalance() {
    setCusdzRevealed(false);
    setCusdzBalance(null);
  }

  // Unwrap cUSDZ → USDZ
  async function handleUnwrap() {
    if (!address || !unwrapAmount) return;
    setError(null);
    setSuccess(null);

    try {
      const signer = await getSigner();
      if (!signer) throw new Error("No signer");
      lastTxProvider.current = signer.provider;
      const cUsdz = new ethers.Contract(CUSDZ_ADDRESS, CUSDZ_ABI, signer);

      const amount = BigInt(Math.round(parseFloat(unwrapAmount) * 1e6));
      const { encryptUint64 } = await import("@/lib/fhe");
      const { handle, inputProof } = await encryptUint64(amount, CUSDZ_ADDRESS, address);

      setStep("unwrapping");
      await (await cUsdz.unwrap(USDZ_ADDRESS, address, handle, inputProof)).wait();

      setSuccess(`Unwrapped ${unwrapAmount} cUSDZ → USDZ!`);
      setStep("idle");
      setUnwrapAmount("");
      setShowUnwrap(false);
      setCusdzRevealed(false);
      setCusdzBalance(null);
      await fetchUsdzBalance(signer.provider);
    } catch (err: any) {
      setError(err?.reason || err?.message || "Unwrap failed");
      setStep("idle");
    }
  }

  async function handleMint() {
    if (!address) return;
    setError(null);
    setSuccess(null);
    const calls = Math.ceil(mintAmount / 10);
    setTotalMints(calls);
    setMintProgress(0);
    setStep("minting");

    try {
      const signer = await getSigner();
      if (!signer) throw new Error("No signer");
      lastTxProvider.current = signer.provider;
      const usdz = new ethers.Contract(USDZ_ADDRESS, USDZ_ABI, signer);

      for (let i = 0; i < calls; i++) {
        const tx = await usdz.mint(address);
        await tx.wait();
        setMintProgress(i + 1);
      }

      setSuccess(`Minted ${calls * 10} USDZ!`);
      setStep("idle");
      await fetchUsdzBalance(signer.provider);
    } catch (err: any) {
      setError(err?.reason || err?.message || "Mint failed");
      setStep("idle");
    }
  }

  async function handleWrap() {
    if (!address || !wrapAmount) return;
    setError(null);
    setSuccess(null);

    try {
      const signer = await getSigner();
      if (!signer) throw new Error("No signer");
      lastTxProvider.current = signer.provider;
      const usdz = new ethers.Contract(USDZ_ADDRESS, USDZ_ABI, signer);
      const cUsdz = new ethers.Contract(CUSDZ_ADDRESS, CUSDZ_ABI, signer);
      const amount = BigInt(Math.round(parseFloat(wrapAmount) * 1e6));

      setStep("approving");
      await (await usdz.approve(CUSDZ_ADDRESS, amount)).wait();

      setStep("wrapping");
      await (await cUsdz.wrap(address, amount)).wait();

      setSuccess(`Wrapped ${wrapAmount} USDZ → cUSDZ!`);
      setStep("idle");
      setWrapAmount("");
      setCusdzRevealed(false);
      setCusdzBalance(null);
      await fetchUsdzBalance(signer.provider);
    } catch (err: any) {
      setError(err?.reason || err?.message || "Wrap failed");
      setStep("idle");
    }
  }

  async function handleMintAndWrap() {
    if (!address) return;
    setError(null);
    setSuccess(null);
    const calls = Math.ceil(mintAmount / 10);
    const mintedAmount = calls * 10;
    setTotalMints(calls);
    setMintProgress(0);

    try {
      const signer = await getSigner();
      if (!signer) throw new Error("No signer");
      lastTxProvider.current = signer.provider;
      const usdz = new ethers.Contract(USDZ_ADDRESS, USDZ_ABI, signer);
      const cUsdz = new ethers.Contract(CUSDZ_ADDRESS, CUSDZ_ABI, signer);

      setStep("minting");
      for (let i = 0; i < calls; i++) {
        const tx = await usdz.mint(address);
        await tx.wait();
        setMintProgress(i + 1);
      }

      const total = BigInt(mintedAmount) * 1000000n;
      setStep("approving");
      await (await usdz.approve(CUSDZ_ADDRESS, total)).wait();

      setStep("wrapping");
      await (await cUsdz.wrap(address, total)).wait();

      setSuccess(`Minted & wrapped ${mintedAmount} cUSDZ! Ready to buy.`);
      setStep("idle");
      setCusdzRevealed(false);
      setCusdzBalance(null);
      await fetchUsdzBalance(signer.provider);
    } catch (err: any) {
      setError(err?.reason || err?.message || "Transaction failed");
      setStep("idle");
    }
  }

  if (!open) return null;

  const isProcessing = step !== "idle";
  const PRESETS = [10, 20, 50, 100];
  const hasCusdz = cusdzRevealed && cusdzBalance && parseFloat(cusdzBalance) > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl border border-surface-200 bg-white shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-royal-100">
              <Droplets className="h-5 w-5 text-royal-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink-800">Token Faucet</h2>
              <p className="text-xs text-ink-500">Get test cUSDZ for the marketplace</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-ink-400 hover:bg-surface-100 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Balances */}
          {address && (
            <div className="rounded-xl bg-surface-100 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-ink-400" />
                  <span className="text-sm text-ink-600">USDZ (plaintext)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-ink-800">{usdzBalance ?? "—"}</span>
                  <button onClick={() => fetchUsdzBalance()} className="rounded p-1 text-ink-400 hover:text-royal-500 transition">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-royal-500" />
                  <span className="text-sm font-medium text-royal-600">cUSDZ (confidential)</span>
                </div>
                <div className="flex items-center gap-2">
                  {cusdzRevealed ? (
                    <>
                      <span className="text-lg font-bold text-royal-600">{cusdzBalance}</span>
                      <button
                        onClick={handleHideBalance}
                        title="Hide balance"
                        className="rounded p-1 text-royal-400 hover:text-royal-600 transition"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-lg font-bold text-royal-600 tracking-widest">****</span>
                      <button
                        onClick={handleRevealBalance}
                        disabled={isProcessing}
                        title="Reveal balance (requires wallet signature)"
                        className="rounded p-1 text-royal-400 hover:text-royal-600 transition disabled:opacity-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {step === "revealing" && (
                <div className="flex items-center gap-2 text-xs text-royal-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sign the message in MetaMask to reveal your balance...
                </div>
              )}
            </div>
          )}

          {/* Amount selector */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink-700">
              Choose amount to mint
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {PRESETS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setMintAmount(amt)}
                  disabled={isProcessing}
                  className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                    mintAmount === amt
                      ? "bg-royal-500 text-white shadow-md shadow-royal-500/20"
                      : "border border-surface-300 bg-white text-ink-600 hover:border-royal-300"
                  }`}
                >
                  {amt} USDZ
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-400">Custom:</span>
              <input
                type="number"
                value={mintAmount}
                onChange={(e) => setMintAmount(Math.max(10, Math.round(Number(e.target.value) / 10) * 10 || 10))}
                disabled={isProcessing}
                min={10}
                step={10}
                className="w-24 rounded-lg border border-surface-300 bg-white px-3 py-1.5 text-sm text-ink-800 focus:border-royal-400 focus:outline-none"
              />
              <span className="text-xs text-ink-400">USDZ (multiples of 10)</span>
            </div>
          </div>

          {/* Progress */}
          {isProcessing && step !== "revealing" && (
            <div className="rounded-xl bg-royal-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-royal-600" />
                <span className="text-sm font-medium text-royal-700">
                  {step === "minting" && `Minting... (${mintProgress}/${totalMints} transactions)`}
                  {step === "approving" && "Approving cUSDZ contract..."}
                  {step === "wrapping" && "Wrapping USDZ → cUSDZ..."}
                  {step === "unwrapping" && "Unwrapping cUSDZ → USDZ..."}
                </span>
              </div>
              {step === "minting" && totalMints > 0 && (
                <div className="h-2 w-full overflow-hidden rounded-full bg-royal-200">
                  <div
                    className="h-full rounded-full bg-royal-500 transition-all duration-500"
                    style={{ width: `${(mintProgress / totalMints) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            <button
              onClick={handleMintAndWrap}
              disabled={isProcessing || !address}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-royal-500 py-3.5 font-semibold text-white shadow-lg shadow-royal-500/20 hover:bg-royal-600 disabled:opacity-50 transition-all"
            >
              <Droplets className="h-4 w-4" />
              Mint {mintAmount} USDZ & Wrap to cUSDZ
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleMint}
                disabled={isProcessing || !address}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-surface-300 py-2.5 text-sm font-semibold text-ink-600 hover:border-royal-300 hover:text-royal-600 disabled:opacity-50 transition"
              >
                Mint Only
              </button>
              <button
                onClick={() => {
                  if (usdzBalance) setWrapAmount(usdzBalance);
                }}
                disabled={isProcessing || !address || !usdzBalance || usdzBalance === "0.00"}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-surface-300 py-2.5 text-sm font-semibold text-ink-600 hover:border-royal-300 hover:text-royal-600 disabled:opacity-50 transition"
              >
                Wrap <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setShowUnwrap(!showUnwrap)}
                disabled={isProcessing || !address}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-surface-300 py-2.5 text-sm font-semibold text-ink-600 hover:border-amber-300 hover:text-amber-600 disabled:opacity-50 transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Unwrap
              </button>
            </div>
          </div>

          {/* Wrap existing USDZ */}
          {wrapAmount && (
            <div className="rounded-xl bg-surface-100 p-4 space-y-3">
              <label className="block text-sm font-medium text-ink-700">Wrap amount (USDZ → cUSDZ)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={wrapAmount}
                  onChange={(e) => setWrapAmount(e.target.value)}
                  min="0.000001"
                  step="0.000001"
                  className="flex-1 rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-ink-800 focus:border-royal-400 focus:outline-none"
                />
                <button
                  onClick={handleWrap}
                  disabled={isProcessing || !wrapAmount}
                  className="rounded-lg bg-royal-500 px-5 py-2 text-sm font-semibold text-white hover:bg-royal-600 disabled:opacity-50 transition"
                >
                  Wrap
                </button>
              </div>
            </div>
          )}

          {/* Unwrap cUSDZ → USDZ */}
          {showUnwrap && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-3">
              <label className="block text-sm font-medium text-amber-800">Unwrap amount (cUSDZ → USDZ)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={unwrapAmount}
                  onChange={(e) => setUnwrapAmount(e.target.value)}
                  placeholder={cusdzRevealed && cusdzBalance ? `Max: ${cusdzBalance}` : "Amount"}
                  min="0.000001"
                  step="0.000001"
                  className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-ink-800 focus:border-amber-400 focus:outline-none"
                />
                {cusdzRevealed && cusdzBalance && (
                  <button
                    onClick={() => setUnwrapAmount(cusdzBalance)}
                    className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 transition"
                  >
                    Max
                  </button>
                )}
                <button
                  onClick={handleUnwrap}
                  disabled={isProcessing || !unwrapAmount}
                  className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition"
                >
                  Unwrap
                </button>
              </div>
              <p className="text-[10px] text-amber-600">
                Converts confidential cUSDZ back to plaintext USDZ. Requires FHE encryption of the amount.
              </p>
            </div>
          )}

          {/* Feedback */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="break-all">{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

          {/* Info */}
          <p className="text-[11px] text-ink-400 leading-relaxed">
            Each mint call gives 10 USDZ from Zama&apos;s faucet contract on Sepolia.
            Wrapping converts plaintext USDZ into confidential cUSDZ for private payments.
            Unwrapping converts cUSDZ back to plaintext USDZ. This is testnet — tokens have no real value.
          </p>
        </div>
      </div>
    </div>
  );
}
