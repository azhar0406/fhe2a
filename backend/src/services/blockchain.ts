import { ethers } from "ethers";
import { config } from "../config";

const USDZ_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function mint(address account)",
];

const MARKETPLACE_ABI = [
  "function nextListingId() view returns (uint256)",
  "function platformFeeBps() view returns (uint256)",
  "function disputeWindow() view returns (uint256)",
  "function cUSDZ() view returns (address)",
  "function totalRevenue() view returns (uint256)",
  "function totalFees() view returns (uint256)",
  "function paused() view returns (bool)",

  // Listings
  "function getListing(uint256) view returns (tuple(uint256 id, uint64 price, address seller, address buyer, string productName, string category, string description, string imageUrl, uint8 status, bool isRevealed, bool fundsReleased, uint256 createdAt, uint256 soldAt))",
  "function getAvailableListings() view returns (tuple(uint256 id, uint64 price, address seller, address buyer, string productName, string category, string description, string imageUrl, uint8 status, bool isRevealed, bool fundsReleased, uint256 createdAt, uint256 soldAt)[])",
  "function getListingsByCategory(string) view returns (tuple(uint256 id, uint64 price, address seller, address buyer, string productName, string category, string description, string imageUrl, uint8 status, bool isRevealed, bool fundsReleased, uint256 createdAt, uint256 soldAt)[])",
  "function getSellerListingIds(address) view returns (uint256[])",
  "function getBuyerOrderIds(address) view returns (uint256[])",
  "function getMyListings() view returns (tuple(uint256 id, uint64 price, address seller, address buyer, string productName, string category, string description, string imageUrl, uint8 status, bool isRevealed, bool fundsReleased, uint256 createdAt, uint256 soldAt)[])",
  "function getMyPurchases() view returns (tuple(uint256 id, uint64 price, address seller, address buyer, string productName, string category, string description, string imageUrl, uint8 status, bool isRevealed, bool fundsReleased, uint256 createdAt, uint256 soldAt)[])",
  "function isRevealed(uint256) view returns (bool)",

  // Categories
  "function getAllCategories() view returns (string[])",
  "function getAllCategoriesWithData() view returns (string[], uint256[], uint256[], bool[])",

  // Seller
  "function getSellerProfile(address) view returns (tuple(uint256 totalSales, uint256 totalDisputes, uint256 disputesLost, bool banned))",
  "function getRevenueStats() view returns (uint256 revenue, uint256 fees, uint256 total)",

  // Events
  "event ListingCreated(uint256 indexed id, address indexed seller, string productName, uint64 price, string category)",
  "event LicensePurchased(uint256 indexed id, address indexed buyer, address indexed seller, uint64 price)",
  "event LicenseRevealed(uint256 indexed id, address indexed owner)",
  "event FundsReleased(uint256 indexed id, address indexed seller)",
  "event DisputeOpened(uint256 indexed id, address indexed buyer)",
  "event DisputeResolved(uint256 indexed id, bool buyerWins)",
];

function formatListing(l: any) {
  return {
    id: Number(l.id),
    price: l.price.toString(),
    seller: l.seller,
    buyer: l.buyer,
    productName: l.productName,
    category: l.category,
    description: l.description,
    imageUrl: l.imageUrl,
    status: Number(l.status),
    isRevealed: l.isRevealed,
    fundsReleased: l.fundsReleased,
    createdAt: Number(l.createdAt),
    soldAt: Number(l.soldAt),
  };
}

class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private usdzContract: ethers.Contract;
  private marketContract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.usdzContract = new ethers.Contract(config.usdzAddress, USDZ_ABI, this.provider);
    this.marketContract = new ethers.Contract(config.marketplaceAddress, MARKETPLACE_ABI, this.provider);
  }

  async getAvailableListings() {
    const listings = await this.marketContract.getAvailableListings();
    return listings.map(formatListing);
  }

  async getListing(id: number) {
    const l = await this.marketContract.getListing(id);
    return formatListing(l);
  }

  async getListingsByCategory(category: string) {
    const listings = await this.marketContract.getListingsByCategory(category);
    return listings.map(formatListing);
  }

  async getSellerListings(address: string) {
    const ids: bigint[] = await this.marketContract.getSellerListingIds(address);
    const listings = await Promise.all(ids.map((id) => this.getListing(Number(id))));
    return listings;
  }

  async getBuyerOrders(address: string) {
    const ids: bigint[] = await this.marketContract.getBuyerOrderIds(address);
    const orders = await Promise.all(ids.map((id) => this.getListing(Number(id))));
    return orders;
  }

  async getSellerProfile(address: string) {
    const p = await this.marketContract.getSellerProfile(address);
    const total = Number(p.totalSales);
    const lost = Number(p.disputesLost);
    return {
      address,
      totalSales: total,
      totalDisputes: Number(p.totalDisputes),
      disputesLost: lost,
      banned: p.banned,
      trustScore: total > 0 ? Math.round(((total - lost) / total) * 100) : 100,
    };
  }

  async getAllCategories() {
    return await this.marketContract.getAllCategories();
  }

  async getAllCategoriesWithData() {
    const [names, counts, thresholds, active] = await this.marketContract.getAllCategoriesWithData();
    return names.map((name: string, i: number) => ({
      name,
      count: Number(counts[i]),
      threshold: Number(thresholds[i]),
      active: active[i],
    }));
  }

  async getMarketplaceConfig() {
    const [feeBps, disputeWindowSec, isPaused] = await Promise.all([
      this.marketContract.platformFeeBps(),
      this.marketContract.disputeWindow(),
      this.marketContract.paused(),
    ]);

    return {
      platformFeeBps: Number(feeBps),
      disputeWindowSeconds: Number(disputeWindowSec),
      paused: isPaused,
      usdzAddress: config.usdzAddress,
      cusdzAddress: config.cusdzAddress,
      marketplaceAddress: config.marketplaceAddress,
      token: { name: "Confidential USDZ", symbol: "cUSDZ", decimals: 6 },
    };
  }

  async getRevenueStats() {
    const [revenue, fees, total] = await this.marketContract.getRevenueStats();
    return { revenue: revenue.toString(), fees: fees.toString(), total: total.toString() };
  }

  async searchListings(query: string) {
    const listings = await this.getAvailableListings();
    const q = query.toLowerCase();
    return listings.filter(
      (l: any) =>
        l.productName.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q)
    );
  }

  async getUsdzBalance(address: string): Promise<string> {
    const balance = await this.usdzContract.balanceOf(address);
    return balance.toString();
  }
}

export const blockchainService = new BlockchainService();
