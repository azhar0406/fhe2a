// Zama token addresses on Sepolia
export const USDZ_ADDRESS =
  process.env.NEXT_PUBLIC_USDZ_ADDRESS || "0x3edf60dd017ace33a0220f78741b5581c385a1ba";
export const CUSDZ_ADDRESS =
  process.env.NEXT_PUBLIC_CUSDZ_ADDRESS || "0x7215691f60c4fa7bb82c5ac44c7d57dc32bb0493";
export const MARKETPLACE_ADDRESS =
  process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || "0x5A7CF0188659D84e290bC2746528987b57082D2c";

// USDZ — Zama's plaintext mock stablecoin (anyone can mint 10 USDZ)
export const USDZ_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function mint(address account)",
] as const;

// cUSDZ — Zama's confidential wrapped USDZ (operator-based approval)
export const CUSDZ_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function underlying() view returns (address)",
  "function rate() view returns (uint256)",
  // Operator-based approval (replaces traditional approve)
  "function setOperator(address operator, uint48 deadline)",
  "function isOperator(address owner, address operator) view returns (bool)",
  // Confidential transfers
  "function confidentialTransfer(address to, bytes32 encryptedAmount, bytes inputProof)",
  "function confidentialTransferFrom(address from, address to, bytes32 encryptedAmount, bytes inputProof)",
  // Wrap plaintext USDZ → confidential cUSDZ (1st arg = recipient of cUSDZ, not source ERC20)
  "function wrap(address to, uint256 amount)",
  // Unwrap confidential cUSDZ → plaintext USDZ
  "function unwrap(address erc20, address to, bytes32 encAmount, bytes inputProof)",
] as const;

// LicenseMarketplace — enhanced with categories, reveal, encrypted code+pin
export const MARKETPLACE_ABI = [
  "function nextListingId() view returns (uint256)",
  "function platformFeeBps() view returns (uint256)",
  "function disputeWindow() view returns (uint256)",
  "function cUSDZ() view returns (address)",
  "function paused() view returns (bool)",

  // Create
  "function createListing(string productName, string category, string description, string imageUrl, uint64 price, uint256 expiryDate, bytes32 encCode, bytes32 encPin, bytes inputProof) returns (uint256)",
  "function adminCreateListing(string productName, string category, string description, string imageUrl, uint64 price, uint256 expiryDate, bytes32 encCode, bytes32 encPin, bytes inputProof) returns (uint256)",
  "function cancelListing(uint256 id)",

  // Purchase
  "function buyLicense(uint256 id, bytes32 encAmount, bytes inputProof)",
  "function purchaseOnBehalf(address user, uint256 id)",

  // Reveal
  "function revealLicense(uint256 id) returns (uint256 encryptedCode, uint256 encryptedPin)",
  "function isRevealed(uint256 id) view returns (bool)",

  // Escrow
  "function releaseFunds(uint256 id)",
  "function openDispute(uint256 id)",
  "function resolveDispute(uint256 id, bool buyerWins)",

  // Resell
  "function resellLicense(uint256 originalId, uint64 newPrice) returns (uint256)",
  "function resold(uint256) view returns (bool)",

  // Views
  "function getListing(uint256) view returns (tuple(uint256 id, uint64 price, address seller, address buyer, string productName, string category, string description, string imageUrl, uint8 status, bool isRevealed, bool fundsReleased, uint256 createdAt, uint256 soldAt))",
  "function getAvailableListings() view returns (tuple(uint256 id, uint64 price, address seller, address buyer, string productName, string category, string description, string imageUrl, uint8 status, bool isRevealed, bool fundsReleased, uint256 createdAt, uint256 soldAt)[])",
  "function getListingsByCategory(string) view returns (tuple(uint256 id, uint64 price, address seller, address buyer, string productName, string category, string description, string imageUrl, uint8 status, bool isRevealed, bool fundsReleased, uint256 createdAt, uint256 soldAt)[])",
  "function getMyListings() view returns (tuple(uint256 id, uint64 price, address seller, address buyer, string productName, string category, string description, string imageUrl, uint8 status, bool isRevealed, bool fundsReleased, uint256 createdAt, uint256 soldAt)[])",
  "function getMyPurchases() view returns (tuple(uint256 id, uint64 price, address seller, address buyer, string productName, string category, string description, string imageUrl, uint8 status, bool isRevealed, bool fundsReleased, uint256 createdAt, uint256 soldAt)[])",
  "function getRevealedListing(uint256) view returns (tuple(uint256 id, uint64 price, address seller, address buyer, string productName, string category, string description, string imageUrl, uint8 status, bool isRevealed, bool fundsReleased, uint256 encryptedCode, uint256 encryptedPin))",

  // Categories
  "function getAllCategories() view returns (string[])",
  "function getAllCategoriesWithData() view returns (string[], uint256[], uint256[], bool[])",

  // Seller
  "function getSellerProfile(address) view returns (tuple(uint256 totalSales, uint256 totalDisputes, uint256 disputesLost, bool banned))",
  "function getRevenueStats() view returns (uint256 revenue, uint256 fees, uint256 total)",

  // Admin
  "function owner() view returns (address)",
  "function updatePlatformFee(uint256 newFeeBps)",
  "function updateDisputeWindow(uint256 newWindow)",
  "function banSeller(address seller, bool banned)",
  "function addCategory(string category, uint256 threshold)",
  "function pause()",
  "function unpause()",

  // Events
  "event ListingCreated(uint256 indexed id, address indexed seller, string productName, uint64 price, string category)",
  "event LicensePurchased(uint256 indexed id, address indexed buyer, address indexed seller, uint64 price)",
  "event LicenseRevealed(uint256 indexed id, address indexed owner)",
] as const;
