export type OrderStatus = 'pending' | 'confirmed' | 'cancelled' | 'awaiting_response' | 'failed';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  sku?: string;
  variant?: string;
}

export interface OrderAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
}

export interface OrderTimeline {
  id: string;
  action: string;
  timestamp: Date;
  details?: string;
}

export interface Order {
  id: string;
  shopifyOrderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: OrderItem[];
  address: OrderAddress;
  totalValue: number;
  currency: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  messageSentAt?: Date;
  responseReceivedAt?: Date;
  timeline: OrderTimeline[];
  shopifyTags?: string[];
}

export interface DashboardMetrics {
  pendingOrders: number;
  confirmedOrders: number;
  cancelledOrders: number;
  awaitingResponse: number;
  conversionRate: number;
  totalRevenue: number;
  confirmedRevenue: number;
}

export interface ChartData {
  date: string;
  confirmed: number;
  cancelled: number;
  pending: number;
}
