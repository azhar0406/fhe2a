const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("fhe2a_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  getNonce: (address: string) =>
    fetchApi<{ message: string; nonce: string }>(`/auth/nonce?address=${address}`),

  verifySignature: (address: string, signature: string) =>
    fetchApi<{ token: string; address: string }>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ address, signature }),
    }),

  // Listings
  getListings: (params?: { page?: number; pageSize?: number; category?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", params.page.toString());
    if (params?.pageSize) query.set("pageSize", params.pageSize.toString());
    if (params?.category) query.set("category", params.category);
    if (params?.search) query.set("search", params.search);
    return fetchApi<{ data: any[] }>(
      `/listings?${query.toString()}`
    );
  },

  getListing: (id: number) => fetchApi<any>(`/listings/${id}`),

  getCategories: () => fetchApi<{ data: any[] }>("/listings/categories"),

  getSellerProfile: (address: string) => fetchApi<any>(`/listings/seller/${address}/profile`),

  // Orders
  getMyOrders: () => fetchApi<{ orders: any[] }>("/orders/my"),
  getMySales: () => fetchApi<{ listings: any[] }>("/orders/my-sales"),

  // Config
  getConfig: () => fetchApi<any>("/config"),
  getHealth: () => fetchApi<any>("/health"),
};
