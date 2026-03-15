/**
 * FHE Service — helpers for interacting with Zama's relayer SDK on the backend.
 * Used for public decryption verification and admin operations.
 */

import { config } from "../config";

// Sepolia relayer configuration
const RELAYER_CONFIG = {
  aclContractAddress: "0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D",
  kmsContractAddress: "0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A",
  inputVerifierContractAddress: "0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0",
  verifyingContractAddressDecryption: "0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478",
  verifyingContractAddressInputVerification: "0x483b9dE06E4E4C7D35CCf5837A1668487406D955",
  chainId: 11155111,
  gatewayChainId: 10901,
  network: config.rpcUrl,
  relayerUrl: "https://relayer.testnet.zama.org",
};

let fheInstance: any = null;

export async function getFheInstance() {
  if (fheInstance) return fheInstance;

  // Dynamic import for ESM compat
  const { createInstance } = await import("@zama-fhe/relayer-sdk");
  fheInstance = await createInstance(RELAYER_CONFIG);
  return fheInstance;
}

/**
 * Create an encrypted input buffer for a given contract + user.
 */
export async function createEncryptedInput(contractAddress: string, userAddress: string) {
  const instance = await getFheInstance();
  return instance.createEncryptedInput(contractAddress, userAddress);
}

/**
 * Public decrypt a list of ciphertext handles.
 * Returns cleartext values with their decryption proofs.
 */
export async function publicDecrypt(handles: string[]) {
  const instance = await getFheInstance();
  return instance.publicDecrypt(handles);
}
