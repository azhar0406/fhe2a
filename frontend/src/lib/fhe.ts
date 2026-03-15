"use client";

// Polyfill BigInt JSON serialization — Zama SDK internally uses JSON.stringify
// on objects containing BigInt values which crashes without this.
if (typeof BigInt !== "undefined" && !(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

let fheInstance: any = null;
let sdkInitialized = false;

const SEPOLIA_CONFIG = {
  aclContractAddress: "0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D",
  kmsContractAddress: "0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A",
  inputVerifierContractAddress: "0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0",
  verifyingContractAddressDecryption: "0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478",
  verifyingContractAddressInputVerification: "0x483b9dE06E4E4C7D35CCf5837A1668487406D955",
  chainId: 11155111,
  gatewayChainId: 10901,
  network: process.env.NEXT_PUBLIC_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
  relayerUrl: "https://relayer.testnet.zama.org",
};

export async function getFheInstance() {
  if (fheInstance) return fheInstance;

  const sdk = await import("@zama-fhe/relayer-sdk/web");

  // Initialize WASM modules explicitly before createInstance.
  // Next.js webpack rewrites import.meta.url so the SDK can't auto-locate
  // the .wasm files. We point it to copies served from /public/wasm/.
  if (!sdkInitialized) {
    await sdk.initSDK({
      tfheParams: "/wasm/tfhe_bg.wasm",
      kmsParams: "/wasm/kms_lib_bg.wasm",
    });
    sdkInitialized = true;
  }

  fheInstance = await sdk.createInstance(SEPOLIA_CONFIG);
  return fheInstance;
}

/**
 * Encrypt a uint64 value for a specific contract call.
 */
export async function encryptUint64(
  value: bigint,
  contractAddress: string,
  userAddress: string
): Promise<{ handle: string; inputProof: string }> {
  const instance = await getFheInstance();
  const input = instance.createEncryptedInput(contractAddress, userAddress);
  input.add64(value);
  const encrypted = await input.encrypt();
  return {
    handle: encrypted.handles[0],
    inputProof: encrypted.inputProof,
  };
}

/**
 * Encrypt a uint256 value (for license keys).
 */
export async function encryptUint256(
  value: bigint,
  contractAddress: string,
  userAddress: string
): Promise<{ handle: string; inputProof: string }> {
  const instance = await getFheInstance();
  const input = instance.createEncryptedInput(contractAddress, userAddress);
  input.add256(value);
  const encrypted = await input.encrypt();
  return {
    handle: encrypted.handles[0],
    inputProof: encrypted.inputProof,
  };
}

/**
 * Encrypt both a uint256 (license key) and uint64 (amount) in one input.
 * Both share the same inputProof.
 */
export async function encryptKeyAndAmount(
  key: bigint,
  amount: bigint,
  contractAddress: string,
  userAddress: string
): Promise<{ handles: string[]; inputProof: string }> {
  const instance = await getFheInstance();
  const input = instance.createEncryptedInput(contractAddress, userAddress);
  input.add256(key);
  input.add64(amount);
  const encrypted = await input.encrypt();
  return {
    handles: encrypted.handles,
    inputProof: encrypted.inputProof,
  };
}

/**
 * Convert a license key string (e.g. "XXXX-YYYY-ZZZZ") to a BigInt for encryption.
 */
export function licenseKeyToUint256(key: string): bigint {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(key);
  if (bytes.length > 32) {
    throw new Error("License key too long (max 32 bytes)");
  }
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  return result;
}

/**
 * Convert a uint256 back to a license key string.
 */
export function uint256ToLicenseKey(value: bigint): string {
  const bytes: number[] = [];
  let v = value;
  while (v > 0n) {
    bytes.unshift(Number(v & 0xffn));
    v >>= 8n;
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

/**
 * Request user decryption of a ciphertext handle.
 * This uses EIP-712 signed authorization and the relayer to re-encrypt for the user's key.
 */
/**
 * Decrypt a single handle.
 */
export async function userDecrypt(
  handle: string,
  contractAddress: string,
  signer: any
): Promise<bigint> {
  const results = await userDecryptBatch([handle], contractAddress, signer);
  return results[0];
}

/**
 * Decrypt multiple handles in a single request (one MetaMask signature).
 * Zama SDK expects all handles batched together with one keypair + one signature.
 */
export async function userDecryptBatch(
  handles: string[],
  contractAddress: string,
  signer: any
): Promise<bigint[]> {
  console.log("[FHE] Getting instance...");
  const instance = await getFheInstance();

  console.log("[FHE] Generating keypair...");
  const keypair = instance.generateKeypair();
  const startTimestamp = Math.floor(Date.now() / 1000);
  const durationDays = 1;

  console.log("[FHE] Creating EIP-712 for contract:", contractAddress);
  const eip712 = instance.createEIP712(
    keypair.publicKey,
    [contractAddress],
    startTimestamp,
    durationDays
  );

  console.log("[FHE] Requesting MetaMask signature...");
  const signature = await signer.signTypedData(
    eip712.domain,
    { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
    eip712.message
  );
  console.log("[FHE] Signature obtained:", signature.slice(0, 20) + "...");

  const signerAddress = await signer.getAddress();
  const handleObjects = handles.map(h => ({ handle: h, contractAddress }));
  console.log("[FHE] Decrypting", handles.length, "handles for", signerAddress);
  console.log("[FHE] Handles:", handles);

  const result = await instance.userDecrypt(
    handleObjects,
    keypair.privateKey,
    keypair.publicKey,
    signature.replace("0x", ""),
    [contractAddress],
    signerAddress,
    startTimestamp,
    durationDays
  );
  console.log("[FHE] Raw result:", JSON.stringify(result, (_, v) => typeof v === "bigint" ? v.toString() : v));

  return handles.map(h => {
    const value = result[h] ?? result[h.toLowerCase()];
    if (value === undefined || value === null) {
      throw new Error("Decryption returned no value for handle: " + h);
    }
    return BigInt(value);
  });
}
