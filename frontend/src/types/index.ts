export interface Listing {
  id: number;
  seller: string;
  buyer: string;
  productName: string;
  category: string;
  description: string;
  imageUrl: string;
  price: string;
  status: ListingStatus;
  isRevealed: boolean;
  fundsReleased: boolean;
  createdAt: number;
  soldAt: number;
}

export enum ListingStatus {
  Active = 0,
  Sold = 1,
  Cancelled = 2,
  Disputed = 3,
  Resolved = 4,
}

export interface SellerProfile {
  address: string;
  totalSales: number;
  totalDisputes: number;
  disputesLost: number;
  banned: boolean;
  trustScore: number;
}

export interface CategoryData {
  name: string;
  count: number;
  threshold: number;
  active: boolean;
}

export interface MarketplaceConfig {
  platformFeeBps: number;
  disputeWindowSeconds: number;
  paused: boolean;
  usdzAddress: string;
  cusdzAddress: string;
  marketplaceAddress: string;
  token: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const STATUS_LABELS: Record<ListingStatus, string> = {
  [ListingStatus.Active]: "Active",
  [ListingStatus.Sold]: "Sold",
  [ListingStatus.Cancelled]: "Cancelled",
  [ListingStatus.Disputed]: "Disputed",
  [ListingStatus.Resolved]: "Resolved",
};

// Default categories matching contract defaults
export const DEFAULT_CATEGORIES = [
  "Game",
  "Software",
  "Subscription",
  "Gift Card",
  "Other",
] as const;

export type Category = string;
