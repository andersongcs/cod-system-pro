import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Order, OrderStatus } from "@/types/order";
import { Trash2, Eye, Filter, Download, Search, MessageSquare, RefreshCw, MoreHorizontal, MapPin, Package, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { orderService } from "@/services/orderService";
import { useQuery } from "@tanstack/react-query";

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-warning text-warning-foreground" },
  confirmed: { label: "Confirmado", color: "bg-success text-success-foreground" },
  cancelled: { label: "Cancelado", color: "bg-destructive text-destructive-foreground" },
  awaiting_response: { label: "Aguardando", color: "bg-info text-info-foreground" },
  failed: { label: "Falhou", color: "bg-destructive/80 text-destructive-foreground" },
};

export default function Orders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: orderService.fetchOrders,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPhone.includes(searchQuery);

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
          <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
          <p className="text-muted-foreground">
            Gerencie todos os pedidos e acompanhe o fluxo de confirmação
          </p>
        </div>

        {/* Filters */}
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, cliente ou telefone..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                    <SelectItem value="awaiting_response">Aguardando</SelectItem>
                    <SelectItem value="failed">Falhou</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Atualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">
              {filteredOrders.length} pedidos encontrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum pedido encontrado.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const status = statusConfig[order.status] || { label: order.status, color: "bg-secondary text-secondary-foreground" };
                    return (
                      <TableRow key={order.id} className="hover:bg-muted/50">
                        <TableCell>
                          <span className="font-medium">#{order.orderNumber}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{order.customerName}</span>
                            <span className="text-sm text-muted-foreground">{order.customerPhone}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {formatCurrency(order.totalValue)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("min-w-[90px] justify-center", status.color)}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {format(order.createdAt, "dd/MM/yyyy HH:mm")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(order.createdAt, { addSuffix: true, locale: ptBR })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              {(order.status === "pending" || order.status === "failed") && (
                                <>
                                  <DropdownMenuItem onClick={() => {
                                    fetch('/api/whatsapp/send-confirmation', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ orderId: order.id })
                                    })
                                      .then(res => res.json())
                                      .then(data => {
                                        if (data.success) {
                                          toast.success("Mensagem enviada com sucesso!");
                                        } else {
                                          toast.error("Erro ao enviar: " + data.message);
                                        }
                                      })
                                      .catch(() => toast.error("Erro ao conectar com servidor"));
                                  }}>
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    Reenviar para WhatsApp
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Cancelar Pedido
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Order Details Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Pedido #{selectedOrder?.orderNumber}</DialogTitle>
              <DialogDescription>
                Detalhes completos do pedido e histórico de ações
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Cliente
                    </h4>
                    <div className="rounded-lg border border-border/50 p-3 text-sm">
                      <p className="font-medium">{selectedOrder.customerName}</p>
                      <p className="text-muted-foreground">{selectedOrder.customerPhone}</p>
                      {selectedOrder.customerEmail && (
                        <p className="text-muted-foreground">{selectedOrder.customerEmail}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Endereço
                    </h4>
                    <div className="rounded-lg border border-border/50 p-3 text-sm">
                      <p>{selectedOrder.address.street}</p>
                      <p>{selectedOrder.address.city}, {selectedOrder.address.state}</p>
                      <p>{selectedOrder.address.zip}</p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Itens
                  </h4>
                  <div className="rounded-lg border border-border/50 p-3">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between py-2 border-b border-border/50 last:border-0">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            SKU: {item.sku} • Qtd: {item.quantity}
                          </p>
                        </div>
                        <p className="font-medium">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                    <div className="flex justify-between pt-3 font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(selectedOrder.totalValue)}</span>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timeline
                  </h4>
                  <div className="space-y-3">
                    {selectedOrder.timeline.map((event, index) => (
                      <div key={event.id} className="flex gap-3">
                        <div className="relative flex flex-col items-center">
                          <div className="h-3 w-3 rounded-full bg-primary" />
                          {index < selectedOrder.timeline.length - 1 && (
                            <div className="h-full w-0.5 bg-border" />
                          )}
                        </div>
                        <div className="pb-4">
                          <p className="font-medium text-sm">{event.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(event.timestamp, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                          {event.details && (
                            <p className="text-sm text-muted-foreground mt-1">{event.details}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
                  {(selectedOrder.status === "pending" || selectedOrder.status === "failed") && (
                    <Button>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reenviar Mensagem
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
