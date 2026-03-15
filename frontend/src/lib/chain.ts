import { ethers } from "ethers";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "./contracts";
import type { Listing } from "@/types";

function getProvider() {
  const rpc = process.env.NEXT_PUBLIC_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
  return new ethers.JsonRpcProvider(rpc);
}

function getMarketplace(signerOrProvider?: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(
    MARKETPLACE_ADDRESS,
    MARKETPLACE_ABI,
    signerOrProvider || getProvider()
  );
}

function tupleToListing(t: any): Listing {
  return {
    id: Number(t.id),
    price: t.price.toString(),
    seller: t.seller,
    buyer: t.buyer,
    productName: t.productName,
    category: t.category,
    description: t.description,
    imageUrl: t.imageUrl,
    status: Number(t.status),
    isRevealed: t.isRevealed,
    fundsReleased: t.fundsReleased,
    createdAt: Number(t.createdAt),
    soldAt: Number(t.soldAt),
  };
}

export async function getAvailableListings(): Promise<Listing[]> {
  const market = getMarketplace();
  const raw = await market.getAvailableListings();
  return raw.map(tupleToListing);
}

export async function getListing(id: number): Promise<Listing> {
  const market = getMarketplace();
  const raw = await market.getListing(id);
  return tupleToListing(raw);
}

export async function getListingsByCategory(category: string): Promise<Listing[]> {
  const market = getMarketplace();
  const raw = await market.getListingsByCategory(category);
  return raw.map(tupleToListing);
}

export async function getAllCategories(): Promise<string[]> {
  const market = getMarketplace();
  return await market.getAllCategories();
}

export async function getNextListingId(): Promise<number> {
  const market = getMarketplace();
  return Number(await market.nextListingId());
}

export async function getMyPurchases(signer: ethers.Signer): Promise<Listing[]> {
  const market = getMarketplace(signer);
  const raw = await market.getMyPurchases();
  return raw.map(tupleToListing);
}

export async function getMyListings(signer: ethers.Signer): Promise<Listing[]> {
  const market = getMarketplace(signer);
  const raw = await market.getMyListings();
  return raw.map(tupleToListing);
}

// Check if a listing has already been resold (contract-level)
export async function isResold(id: number): Promise<boolean> {
  const market = getMarketplace();
  return await market.resold(id);
}

// Get all listings (active) for a given product name — for G2A-style multi-seller view
export async function getListingsForProduct(productName: string): Promise<Listing[]> {
  const market = getMarketplace();
  const raw = await market.getAvailableListings();
  const all: Listing[] = raw.map(tupleToListing);
  return all
    .filter((l: Listing) => l.productName === productName)
    .sort((a: Listing, b: Listing) => Number(a.price) - Number(b.price));
}
