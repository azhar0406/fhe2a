import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ethers } from "ethers";
import { config } from "../config";
import type { JwtPayload } from "../types";

declare global {
  namespace Express {
    interface Request {
      userAddress?: string;
    }
  }
}

/**
 * Middleware: Verify JWT token from Authorization header.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.userAddress = payload.address;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Generate a nonce message for wallet signature authentication.
 */
export function generateAuthMessage(address: string, nonce: string): string {
  return `Sign this message to authenticate with FHE2A Marketplace.\n\nAddress: ${address}\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;
}

/**
 * Verify a signed message and return a JWT.
 */
export function verifySignatureAndCreateToken(
  address: string,
  message: string,
  signature: string
): string | null {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return null;
    }
    return jwt.sign({ address: address.toLowerCase() }, config.jwtSecret, {
      expiresIn: "24h",
    });
  } catch {
    return null;
  }
}
