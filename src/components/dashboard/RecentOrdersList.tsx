import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Order, OrderStatus } from "@/types/order";
import { RefreshCw, Eye, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RecentOrdersListProps {
  orders: Order[];
  onResend?: (orderId: string) => void;
  onViewDetails?: (orderId: string) => void;
}

const statusConfig: Record<OrderStatus, { label: string; variant: 'default' | 'success' | 'destructive' | 'warning' | 'secondary' }> = {
  pending: { label: 'Pendente', variant: 'warning' },
  confirmed: { label: 'Confirmado', variant: 'success' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
  awaiting_response: { label: 'Aguardando', variant: 'secondary' },
  failed: { label: 'Falhou', variant: 'destructive' },
};

export function RecentOrdersList({ orders, onResend, onViewDetails }: RecentOrdersListProps) {
  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Pedidos Recentes</CardTitle>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          Ver todos
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {orders.map((order) => {
            const status = statusConfig[order.status];
            return (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 p-4 transition-all duration-200 hover:bg-card/80"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="font-medium">#{order.orderNumber}</span>
                    <span className="text-sm text-muted-foreground">
                      {order.customerName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium">
                      {order.currency} {order.totalValue.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(order.createdAt, { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>

                  <Badge
                    variant={status.variant === 'success' ? 'default' : status.variant === 'warning' ? 'secondary' : 'destructive'}
                    className={cn(
                      "min-w-[90px] justify-center",
                      status.variant === 'success' && "bg-success text-success-foreground",
                      status.variant === 'warning' && "bg-warning text-warning-foreground",
                      status.variant === 'secondary' && "bg-muted text-muted-foreground"
                    )}
                  >
                    {status.label}
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetails?.(order.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      {(order.status === 'pending' || order.status === 'failed') && (
                        <DropdownMenuItem onClick={() => onResend?.(order.id)}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Reenviar Mensagem
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}

          {orders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground">Nenhum pedido recente</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
