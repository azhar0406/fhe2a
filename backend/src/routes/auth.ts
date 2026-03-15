import { Router, Request, Response } from "express";
import crypto from "crypto";
import { generateAuthMessage, verifySignatureAndCreateToken } from "../middleware/auth";

const router = Router();

// In-memory nonce store (use Redis in production)
const nonceStore = new Map<string, { nonce: string; message: string; expiresAt: number }>();

/**
 * GET /api/auth/nonce?address=0x...
 * Returns a nonce message for the user to sign.
 */
router.get("/nonce", (req: Request, res: Response): void => {
  const address = req.query.address as string;
  if (!address) {
    res.status(400).json({ error: "Address required" });
    return;
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const message = generateAuthMessage(address, nonce);

  nonceStore.set(address.toLowerCase(), {
    nonce,
    message,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 min expiry
  });

  res.json({ message, nonce });
});

/**
 * POST /api/auth/verify
 * Body: { address, signature }
 * Returns JWT token on success.
 */
router.post("/verify", (req: Request, res: Response): void => {
  const { address, signature } = req.body;
  if (!address || !signature) {
    res.status(400).json({ error: "Address and signature required" });
    return;
  }

  const stored = nonceStore.get(address.toLowerCase());
  if (!stored || stored.expiresAt < Date.now()) {
    nonceStore.delete(address.toLowerCase());
    res.status(400).json({ error: "Nonce expired or not found. Request a new nonce." });
    return;
  }

  const token = verifySignatureAndCreateToken(address, stored.message, signature);
  nonceStore.delete(address.toLowerCase());

  if (!token) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  res.json({ token, address: address.toLowerCase() });
});

export default router;
