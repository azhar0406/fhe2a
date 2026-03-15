import express from "express";
import cors from "cors";
import morgan from "morgan";
import { config } from "./config";
import authRouter from "./routes/auth";
import listingsRouter from "./routes/listings";
import ordersRouter from "./routes/orders";
import { blockchainService } from "./services/blockchain";

const app = express();

// Middleware
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/listings", listingsRouter);
app.use("/api/orders", ordersRouter);

// Health check
app.get("/api/health", async (_req, res) => {
  try {
    const marketConfig = await blockchainService.getMarketplaceConfig();
    res.json({ status: "ok", ...marketConfig });
  } catch {
    res.json({ status: "ok", note: "blockchain not connected" });
  }
});

// Marketplace config (public)
app.get("/api/config", async (_req, res) => {
  try {
    const marketConfig = await blockchainService.getMarketplaceConfig();
    res.json(marketConfig);
  } catch (err) {
    console.error("Error fetching config:", err);
    res.status(500).json({ error: "Failed to fetch marketplace config" });
  }
});

app.listen(config.port, () => {
  console.log(`FHE2A Backend running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});
