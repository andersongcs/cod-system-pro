import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, RotateCcw, Moon, History, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivityLog {
  id: string;
  timestamp: Date;
  type: "send" | "confirm" | "cancel" | "error" | "retry";
  message: string;
  orderId?: string;
}

const mockActivityLogs: ActivityLog[] = [
  { id: "1", timestamp: new Date(Date.now() - 300000), type: "confirm", message: "Pedido #1001 confirmado pelo cliente", orderId: "1001" },
  { id: "2", timestamp: new Date(Date.now() - 600000), type: "send", message: "Mensagem enviada para pedido #1002", orderId: "1002" },
  { id: "3", timestamp: new Date(Date.now() - 900000), type: "cancel", message: "Pedido #999 cancelado pelo cliente", orderId: "999" },
  { id: "4", timestamp: new Date(Date.now() - 1200000), type: "error", message: "Falha ao enviar mensagem - número inválido", orderId: "998" },
  { id: "5", timestamp: new Date(Date.now() - 1500000), type: "retry", message: "Retentativa de envio para pedido #997", orderId: "997" },
  { id: "6", timestamp: new Date(Date.now() - 1800000), type: "send", message: "Mensagem enviada para pedido #996", orderId: "996" },
  { id: "7", timestamp: new Date(Date.now() - 2100000), type: "confirm", message: "Pedido #995 confirmado pelo cliente", orderId: "995" },
  { id: "8", timestamp: new Date(Date.now() - 2400000), type: "send", message: "Mensagem enviada para pedido #994", orderId: "994" },
];

const logTypeConfig = {
  send: { icon: MessageSquare, color: "text-info", bgColor: "bg-info/20" },
  confirm: { icon: CheckCircle, color: "text-success", bgColor: "bg-success/20" },
  cancel: { icon: XCircle, color: "text-destructive", bgColor: "bg-destructive/20" },
  error: { icon: XCircle, color: "text-destructive", bgColor: "bg-destructive/20" },
  retry: { icon: RotateCcw, color: "text-warning", bgColor: "bg-warning/20" },
};

export default function SettingsAutomation() {
  const [sendDelay, setSendDelay] = useState(1);
  const [maxRetries, setMaxRetries] = useState(3);
  const [retryInterval, setRetryInterval] = useState(5);
  const [enableSchedule, setEnableSchedule] = useState(true);
  const [scheduleStart, setScheduleStart] = useState("08:00");
  const [scheduleEnd, setScheduleEnd] = useState("22:00");
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [logs] = useState<ActivityLog[]>(mockActivityLogs);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automação</h1>
          <p className="text-muted-foreground">
            Configure o comportamento automático do sistema
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Send Delay */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Delay de Envio
                </CardTitle>
                <CardDescription>
                  Tempo de espera antes de enviar a mensagem após o pedido entrar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Delay em minutos</Label>
                    <Badge variant="outline" className="font-mono">
                      {sendDelay} min
                    </Badge>
                  </div>
                  <Slider
                    value={[sendDelay]}
                    onValueChange={(value) => setSendDelay(value[0])}
                    min={0}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Recomendado: 1 minuto para evitar bloqueios por automação
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Retry Settings */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Tentativas de Reenvio
                </CardTitle>
                <CardDescription>
                  Configure as tentativas automáticas em caso de falha
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Máximo de tentativas</Label>
                      <Badge variant="outline" className="font-mono">
                        {maxRetries}x
                      </Badge>
                    </div>
                    <Slider
                      value={[maxRetries]}
                      onValueChange={(value) => setMaxRetries(value[0])}
                      min={0}
                      max={5}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Intervalo entre tentativas</Label>
                      <Badge variant="outline" className="font-mono">
                        {retryInterval} min
                      </Badge>
                    </div>
                    <Slider
                      value={[retryInterval]}
                      onValueChange={(value) => setRetryInterval(value[0])}
                      min={1}
                      max={30}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Settings */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Moon className="h-5 w-5" />
                  Horário de Funcionamento
                </CardTitle>
                <CardDescription>
                  Defina os horários para envio de mensagens
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Ativar restrição de horário</Label>
                    <p className="text-sm text-muted-foreground">
                      Não enviar mensagens fora do horário definido
                    </p>
                  </div>
                  <Switch checked={enableSchedule} onCheckedChange={setEnableSchedule} />
                </div>

                {enableSchedule && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="scheduleStart">Início</Label>
                      <Input
                        id="scheduleStart"
                        type="time"
                        value={scheduleStart}
                        onChange={(e) => setScheduleStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scheduleEnd">Fim</Label>
                      <Input
                        id="scheduleEnd"
                        type="time"
                        value={scheduleEnd}
                        onChange={(e) => setScheduleEnd(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {enableSchedule && (
                  <div className="rounded-lg border border-info/30 bg-info/10 p-4">
                    <p className="text-sm">
                      Mensagens só serão enviadas entre <strong>{scheduleStart}</strong> e <strong>{scheduleEnd}</strong>.
                      Pedidos fora deste horário serão processados no próximo período.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Advanced Settings */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Configurações Avançadas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-confirmar após 24h sem resposta</Label>
                    <p className="text-sm text-muted-foreground">
                      Confirmar automaticamente se não houver resposta
                    </p>
                  </div>
                  <Switch checked={autoConfirm} onCheckedChange={setAutoConfirm} />
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button size="lg">
                Salvar Configurações
              </Button>
            </div>
          </div>

          {/* Activity Log */}
          <div>
            <Card className="glass sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Log de Atividades
                </CardTitle>
                <CardDescription>
                  Últimas ações do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {logs.map((log) => {
                      const config = logTypeConfig[log.type];
                      const Icon = config.icon;
                      return (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 rounded-lg border border-border/50 p-3"
                        >
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full",
                            config.bgColor
                          )}>
                            <Icon className={cn("h-4 w-4", config.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{log.message}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(log.timestamp, "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
