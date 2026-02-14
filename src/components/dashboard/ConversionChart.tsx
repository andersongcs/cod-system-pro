import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface ConversionChartProps {
  confirmed: number;
  cancelled: number;
  pending: number;
}

export function ConversionChart({ confirmed, cancelled, pending }: ConversionChartProps) {
  const data = [
    { name: "Confirmados", value: confirmed, color: "hsl(142 76% 45%)" },
    { name: "Cancelados", value: cancelled, color: "hsl(0 63% 45%)" },
    { name: "Pendentes", value: pending, color: "hsl(38 92% 50%)" },
  ];

  const total = confirmed + cancelled + pending;
  const conversionRate = total > 0 ? ((confirmed / total) * 100).toFixed(1) : 0;

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Taxa de Conversão COD</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center">
          <div className="relative h-[200px] w-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{conversionRate}%</span>
              <span className="text-xs text-muted-foreground">Conversão</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-center gap-4">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-muted-foreground">
                {item.name}: {item.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
