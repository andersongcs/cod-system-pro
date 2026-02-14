import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, CheckCircle, XCircle, RefreshCw, Smartphone, QrCode, History, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface WhatsappStatus {
  connected: boolean;
  qr: string | null;
  info: any;
}

export default function SettingsWhatsApp() {
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const response = await fetch('/api/whatsapp/status');
      if (!response.ok) throw new Error('Failed to fetch status');
      return response.json() as Promise<WhatsappStatus>;
    },
    refetchInterval: 2000, // Poll every 2 seconds
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/whatsapp/disconnect', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to disconnect');
      return response.json();
    },
    onSuccess: () => {
      toast.success("Desconectado com sucesso");
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
    onError: () => {
      toast.error("Erro ao desconectar");
    }
  });

  const isConnected = status?.connected ?? false;
  const qrCode = status?.qr;
  const clientInfo = status?.info;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conexão WhatsApp</h1>
          <p className="text-muted-foreground">
            Gerencie a conexão com o WhatsApp para envio de mensagens
          </p>
        </div>

        {/* Connection Status */}
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl",
                  isConnected ? "bg-success/20" : "bg-muted"
                )}>
                  <MessageSquare className={cn(
                    "h-6 w-6",
                    isConnected ? "text-success" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <CardTitle className="text-lg">Status da Conexão</CardTitle>
                  <CardDescription>
                    {isConnected ? "WhatsApp conectado e pronto para enviar" : "WhatsApp desconectado"}
                  </CardDescription>
                </div>
              </div>
              <Badge
                className={cn(
                  "px-3 py-1",
                  isConnected
                    ? "bg-success text-success-foreground"
                    : "bg-destructive text-destructive-foreground"
                )}
              >
                {isConnected ? (
                  <><CheckCircle className="mr-1 h-3 w-3" /> Conectado</>
                ) : (
                  <><XCircle className="mr-1 h-3 w-3" /> Desconectado</>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : isConnected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20">
                      <Smartphone className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium">Número Conectado</p>
                      <p className="text-sm text-muted-foreground">
                        {clientInfo?.wid?.user ? `+${clientInfo.wid.user}` : 'Desconhecido'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Desconectar
                  </Button>
                </div>

                <div className="rounded-lg border border-success/30 bg-success/10 p-4">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Sessão ativa</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    O WhatsApp está conectado e pronto para enviar mensagens de confirmação
                  </p>
                </div>
              </div>
            ) : qrCode ? (
              <div className="flex flex-col items-center space-y-4 py-8">
                <div className="relative">
                  <div className="h-64 w-64 rounded-xl bg-card p-4 shadow-lg border border-border">
                    <div className="flex h-full w-full items-center justify-center bg-white rounded-lg overflow-hidden">
                      <img src={qrCode} alt="WhatsApp QR Code" className="w-full h-full object-contain" />
                    </div>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 transform">
                    <Badge className="bg-primary text-primary-foreground animate-pulse">
                      Escaneie com o WhatsApp
                    </Badge>
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-medium">Escaneie o QR Code</p>
                  <p className="text-sm text-muted-foreground">
                    Abra o WhatsApp no seu celular e escaneie o código acima
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Gerando QR Code...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backend Notice */}
        <Card className="glass border-info/30 bg-info/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-info/20">
                <MessageSquare className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="font-medium text-info">Servidor Local Conectado</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Esta página está conectada ao seu servidor local (server.js) para gerenciar a sessão do WhatsApp Real em tempo real.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
