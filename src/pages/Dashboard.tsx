import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { OrdersChart } from "@/components/dashboard/OrdersChart";
import { RecentOrdersList } from "@/components/dashboard/RecentOrdersList";
import { ConversionChart } from "@/components/dashboard/ConversionChart";
import { Clock, CheckCircle, XCircle, DollarSign, TrendingUp, MessageSquare, Loader2 } from "lucide-react";
import { orderService } from "@/services/orderService";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Dashboard() {
  const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: orderService.fetchOrders,
  });

  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: orderService.fetchDashboardMetrics,
  });

  // Calculate chart data from orders
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayName = format(date, 'EEE', { locale: ptBR });

    const dayOrders = orders.filter(o =>
      format(new Date(o.createdAt), 'yyyy-MM-dd') === dateStr
    );

    return {
      date: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      confirmed: dayOrders.filter(o => o.status === 'confirmed').length,
      cancelled: dayOrders.filter(o => o.status === 'cancelled').length,
      pending: dayOrders.filter(o => o.status === 'pending').length,
    };
  });

  if (isLoadingOrders || isLoadingMetrics || !metrics) {
    return (
      <MainLayout>
        <div className="flex h-[calc(100vh-100px)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema de confirmação de pedidos COD
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Pendentes"
            value={metrics.pendingOrders}
            subtitle="Aguardando envio"
            icon={Clock}
            variant="warning"
          />
          <MetricCard
            title="Confirmados"
            value={metrics.confirmedOrders}
            subtitle="Total"
            icon={CheckCircle}
            variant="success"
          />
          <MetricCard
            title="Cancelados"
            value={metrics.cancelledOrders}
            subtitle="Total"
            icon={XCircle}
            variant="destructive"
          />
          <MetricCard
            title="Faturamento Confirmado"
            value={formatCurrency(metrics.confirmedRevenue)}
            subtitle="Total"
            icon={DollarSign}
            variant="success"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <OrdersChart data={chartData} />
          </div>
          <ConversionChart
            confirmed={metrics.confirmedOrders}
            cancelled={metrics.cancelledOrders}
            pending={metrics.pendingOrders}
          />
        </div>

        {/* Quick Stats + Recent Orders */}
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="space-y-4">
            <MetricCard
              title="Taxa de Conversão"
              value={`${metrics.conversionRate}%`}
              icon={TrendingUp}
              variant="info"
            />
            <MetricCard
              title="Aguardando Resposta"
              value={metrics.awaitingResponse}
              subtitle="Mensagens enviadas"
              icon={MessageSquare}
              variant="default"
            />
          </div>
          <div className="lg:col-span-3">
            <RecentOrdersList orders={orders.slice(0, 5)} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
