import { supabase } from "@/integrations/supabase/client";
import { Order, OrderStatus, DashboardMetrics } from "@/types/order";

export const orderService = {
  async fetchOrders(): Promise<Order[]> {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        items (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }

    return orders.map((order: any) => ({
      id: order.id,
      shopifyOrderId: order.shopify_order_id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email,
      address: typeof order.address === 'string' ? JSON.parse(order.address) : order.address,
      totalValue: Number(order.total_value),
      currency: order.currency || 'COP',
      status: order.status as OrderStatus,
      createdAt: new Date(order.created_at),
      updatedAt: new Date(order.updated_at),
      messageSentAt: order.message_sent_at ? new Date(order.message_sent_at) : undefined,
      responseReceivedAt: order.response_received_at ? new Date(order.response_received_at) : undefined,
      timeline: typeof order.timeline === 'string' ? JSON.parse(order.timeline) : (order.timeline || []),
      items: Array.isArray(order.items) ? order.items.filter((item: any) => item).map((item: any) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: Number(item.price),
        sku: item.sku,
        variant: item.variant || ''
      })) : []
    }));
  },

  async fetchDashboardMetrics(): Promise<DashboardMetrics> {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('status, total_value');

    if (error) throw error;

    const metrics = {
      pendingOrders: 0,
      confirmedOrders: 0,
      cancelledOrders: 0,
      awaitingResponse: 0,
      conversionRate: 0,
      totalRevenue: 0,
      confirmedRevenue: 0
    };

    orders.forEach((order: any) => {
      const value = Number(order.total_value);
      metrics.totalRevenue += value;

      switch (order.status) {
        case 'pending':
          metrics.pendingOrders++;
          break;
        case 'confirmed':
          metrics.confirmedOrders++;
          metrics.confirmedRevenue += value;
          break;
        case 'cancelled':
          metrics.cancelledOrders++;
          break;
        case 'awaiting_response':
          metrics.awaitingResponse++;
          break;
      }
    });

    const totalProcessed = metrics.confirmedOrders + metrics.cancelledOrders;
    if (totalProcessed > 0) {
      metrics.conversionRate = Number(((metrics.confirmedOrders / totalProcessed) * 100).toFixed(1));
    }

    return metrics;
  }
};
