import { Router, Request, Response } from "express";
import { blockchainService } from "../services/blockchain";
import { requireAuth } from "../middleware/auth";

const router = Router();

/**
 * GET /api/listings
 * Query: ?category=Game&search=windows
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const category = req.query.category as string;
    const search = req.query.search as string;

    let result;
    if (search) {
      result = await blockchainService.searchListings(search);
    } else if (category) {
      result = await blockchainService.getListingsByCategory(category);
    } else {
      result = await blockchainService.getAvailableListings();
    }

    res.json({ data: result });
  } catch (err) {
    console.error("Error fetching listings:", err);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

/**
 * GET /api/listings/categories
 */
router.get("/categories", async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await blockchainService.getAllCategoriesWithData();
    res.json({ data });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

/**
 * GET /api/listings/:id
 */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid listing ID" });
      return;
    }
    const listing = await blockchainService.getListing(id);
    res.json(listing);
  } catch (err) {
    console.error("Error fetching listing:", err);
    res.status(404).json({ error: "Listing not found" });
  }
});

/**
 * GET /api/listings/seller/:address
 */
router.get("/seller/:address", async (req: Request, res: Response): Promise<void> => {
  try {
    const listings = await blockchainService.getSellerListings(req.params.address);
    res.json({ data: listings });
  } catch (err) {
    console.error("Error fetching seller listings:", err);
    res.status(500).json({ error: "Failed to fetch seller listings" });
  }
});

/**
 * GET /api/listings/seller/:address/profile
 */
router.get("/seller/:address/profile", async (req: Request, res: Response): Promise<void> => {
  try {
    const profile = await blockchainService.getSellerProfile(req.params.address);
    res.json(profile);
  } catch (err) {
    console.error("Error fetching seller profile:", err);
    res.status(500).json({ error: "Failed to fetch seller profile" });
  }
});

/**
 * GET /api/listings/buyer/orders (authenticated)
 */
router.get("/buyer/orders", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await blockchainService.getBuyerOrders(req.userAddress!);
    res.json({ data: orders });
  } catch (err) {
    console.error("Error fetching buyer orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

export default router;
