export type ProductId = "loaf" | "roll";

export interface CartItem {
  product: ProductId;
  qty: number;
  price: number;
}

export interface OrderItem {
  product: ProductId;
  qty: number;
  price: number;
}

export type ShippingOption = "overnight" | "2day";

// Payment method = token + chain (e.g. usdc-base, eth-ethereum)
export type PaymentMethod =
  | "usdc-base"
  | "usdc-ethereum"
  | "eth-base"
  | "eth-ethereum"
  | "bread-base"
  | "cult-ethereum";

export type OrderStatus = "pending" | "paid" | "baked" | "shipped";

export interface Order {
  id?: string;
  created_at?: string;
  customer_name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  items: OrderItem[];
  shipping_option: ShippingOption;
  payment_method: PaymentMethod;
  payment_chain?: string | null;
  payment_amount?: string | null;
  total_usd: number;
  status?: OrderStatus;
  tx_hash?: string | null;
  notes?: string | null;
}
