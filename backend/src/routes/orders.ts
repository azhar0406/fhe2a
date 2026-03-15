import { Router, Request, Response } from "express";
import { blockchainService } from "../services/blockchain";
import { requireAuth } from "../middleware/auth";

const router = Router();

/**
 * GET /api/orders/my
 * Returns all orders for the authenticated user (as buyer).
 */
router.get("/my", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await blockchainService.getBuyerOrders(req.userAddress!);
    res.json({ orders });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

/**
 * GET /api/orders/my-sales
 * Returns all listings created by the authenticated user (as seller).
 */
router.get("/my-sales", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const listings = await blockchainService.getSellerListings(req.userAddress!);
    res.json({ listings });
  } catch (err) {
    console.error("Error fetching sales:", err);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
});

/**
 * GET /api/orders/:id
 * Returns details about a specific order/listing.
 */
router.get("/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid order ID" });
      return;
    }
    const listing = await blockchainService.getListing(id);

    // Only seller or buyer can view order details
    const addr = req.userAddress!.toLowerCase();
    if (listing.seller.toLowerCase() !== addr && listing.buyer.toLowerCase() !== addr) {
      res.status(403).json({ error: "Not authorized to view this order" });
      return;
    }

    res.json(listing);
  } catch (err) {
    console.error("Error fetching order:", err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

export default router;
