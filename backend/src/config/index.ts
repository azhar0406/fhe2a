import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  rpcUrl: process.env.RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
  chainId: parseInt(process.env.CHAIN_ID || "11155111", 10),
  usdzAddress: process.env.USDZ_ADDRESS || "0x3edf60dd017ace33a0220f78741b5581c385a1ba",
  cusdzAddress: process.env.CUSDZ_ADDRESS || "0x7215691f60c4fa7bb82c5ac44c7d57dc32bb0493",
  marketplaceAddress: process.env.MARKETPLACE_ADDRESS || "",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
} as const;
