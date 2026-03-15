"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { api } from "@/lib/api";

export function useAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("fhe2a_token");
      const savedAddr = localStorage.getItem("fhe2a_address");
      if (saved && savedAddr === address?.toLowerCase()) {
        setToken(saved);
      } else {
        setToken(null);
      }
    }
  }, [address]);

  const authenticate = useCallback(async () => {
    if (!address || !isConnected) return;
    setIsAuthenticating(true);

    try {
      const { message } = await api.getNonce(address);
      const signature = await signMessageAsync({ message });
      const { token: jwt } = await api.verifySignature(address, signature);

      localStorage.setItem("fhe2a_token", jwt);
      localStorage.setItem("fhe2a_address", address.toLowerCase());
      setToken(jwt);
    } catch (err) {
      console.error("Authentication failed:", err);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  }, [address, isConnected, signMessageAsync]);

  const logout = useCallback(() => {
    localStorage.removeItem("fhe2a_token");
    localStorage.removeItem("fhe2a_address");
    setToken(null);
  }, []);

  return {
    isAuthenticated: !!token,
    token,
    authenticate,
    logout,
    isAuthenticating,
  };
}
