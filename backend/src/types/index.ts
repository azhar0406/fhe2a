export interface ListingResponse {
  id: number;
  seller: string;
  productName: string;
  category: string;
  description: string;
  price: string;
  status: number;
  buyer: string;
  createdAt: number;
  soldAt: number;
  fundsReleased: boolean;
}

export interface SellerProfileResponse {
  address: string;
  totalSales: number;
  totalDisputes: number;
  disputesLost: number;
  banned: boolean;
  trustScore: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface JwtPayload {
  address: string;
  iat: number;
  exp: number;
}
