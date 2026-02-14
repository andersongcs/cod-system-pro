import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartData } from "@/types/order";

interface OrdersChartProps {
  data: ChartData[];
}

export function OrdersChart({ data }: OrdersChartProps) {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Evolução de Pedidos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorConfirmed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142 76% 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142 76% 45%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCancelled" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0 63% 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(0 63% 45%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="confirmed"
                name="Confirmados"
                stroke="hsl(142 76% 45%)"
                fillOpacity={1}
                fill="url(#colorConfirmed)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="cancelled"
                name="Cancelados"
                stroke="hsl(0 63% 45%)"
                fillOpacity={1}
                fill="url(#colorCancelled)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="pending"
                name="Pendentes"
                stroke="hsl(38 92% 50%)"
                fillOpacity={1}
                fill="url(#colorPending)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
