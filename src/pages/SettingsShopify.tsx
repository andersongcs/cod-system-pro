import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Store, CheckCircle, XCircle, RefreshCw, Link2, Tag, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SettingsShopify() {
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [storeUrl, setStoreUrl] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  const [confirmationTag, setConfirmationTag] = useState("cod_confirmed");
  const [autoSync, setAutoSync] = useState(true);
  const [onlyCod, setOnlyCod] = useState(true);
  const [minValue, setMinValue] = useState("");

  // Sync state
  const [syncStartDate, setSyncStartDate] = useState("");
  const [syncEndDate, setSyncEndDate] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      // Get the most active/recent config
      const { data, error } = await supabase
        .from('shopify_configs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStoreUrl(data.shop_url);
        setAccessToken(data.access_token);
        setWebhookSecret(data.webhook_secret || "");
        setIsConnected(data.is_active);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!storeUrl || !accessToken) {
      toast.error("URL e Access Token são obrigatórios");
      return;
    }

    try {
      setLoading(true);

      // Check if exists
      const { data: existing } = await supabase
        .from('shopify_configs')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const payload = {
        shop_url: storeUrl,
        access_token: accessToken,
        webhook_secret: webhookSecret,
        is_active: true
      };

      if (existing?.id) {
        await supabase
          .from('shopify_configs')
          .update(payload)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('shopify_configs')
          .insert(payload);
      }

      setIsConnected(true);
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error('Error saving:', error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('shopify_configs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      setIsConnected(false);
      setStoreUrl("");
      setAccessToken("");
      setWebhookSecret("");
      toast.success("Loja desconectada");
    } catch (error) {
      toast.error("Erro ao desconectar");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncOrders = async () => {
    if (!syncStartDate || !syncEndDate) {
      toast.error("Selecione as datas de início e fim");
      return;
    }

    try {
      setSyncing(true);
      setSyncResult(null);

      const response = await fetch('/api/shopify/sync-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: syncStartDate,
          endDate: syncEndDate
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao sincronizar');
      }

      setSyncResult(data.summary);
      toast.success(`${data.summary.total} pedidos processados!`);
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Erro ao sincronizar pedidos');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conexão Shopify</h1>
          <p className="text-muted-foreground">
            Configure a integração com sua loja Shopify
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
                  <Store className={cn(
                    "h-6 w-6",
                    isConnected ? "text-success" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <CardTitle className="text-lg">Status da Conexão</CardTitle>
                  <CardDescription>
                    {loading ? "Carregando..." : (isConnected ? "Loja conectada" : "Nenhuma loja conectada")}
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
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="storeUrl">URL da Loja Shopify</Label>
                <Input
                  id="storeUrl"
                  placeholder="sua-loja.myshopify.com"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessToken">Admin API Access Token</Label>
                <Input
                  id="accessToken"
                  type="password"
                  placeholder="shpat_..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Token gerado em Configurações &gt; Apps e canais de vendas &gt; Desenvolver apps
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhookSecret">Webhook Shared Secret</Label>
                <Input
                  id="webhookSecret"
                  type="password"
                  placeholder="..."
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Usado para validar notificações de novos pedidos
                </p>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                {isConnected && (
                  <Button variant="destructive" onClick={handleDisconnect} disabled={loading}>
                    Desconectar
                  </Button>
                )}
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar Credenciais
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sync Settings */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Configurações de Sincronização
            </CardTitle>
            <CardDescription>
              Configure como os pedidos serão sincronizados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Sincronização Automática</Label>
                <p className="text-sm text-muted-foreground">
                  Receber pedidos automaticamente via webhook
                </p>
              </div>
              <Switch checked={autoSync} onCheckedChange={setAutoSync} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Apenas Pedidos COD</Label>
                <p className="text-sm text-muted-foreground">
                  Filtrar apenas pedidos Cash on Delivery
                </p>
              </div>
              <Switch checked={onlyCod} onCheckedChange={setOnlyCod} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minValue">Valor Mínimo (R$)</Label>
              <Input
                id="minValue"
                type="number"
                placeholder="0.00"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
                className="max-w-[200px]"
              />
              <p className="text-sm text-muted-foreground">
                Apenas pedidos acima deste valor serão processados (deixe vazio para todos)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Order Sync */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Sincronizar Pedidos Históricos
            </CardTitle>
            <CardDescription>
              Importe pedidos antigos da Shopify por intervalo de datas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="syncStartDate">Data Início</Label>
                <Input
                  id="syncStartDate"
                  type="date"
                  value={syncStartDate}
                  onChange={(e) => setSyncStartDate(e.target.value)}
                  disabled={syncing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="syncEndDate">Data Fim</Label>
                <Input
                  id="syncEndDate"
                  type="date"
                  value={syncEndDate}
                  onChange={(e) => setSyncEndDate(e.target.value)}
                  disabled={syncing}
                />
              </div>
            </div>

            <Button
              onClick={handleSyncOrders}
              disabled={syncing || !isConnected}
              className="w-full"
            >
              {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {syncing ? 'Sincronizando...' : 'Sincronizar Pedidos'}
            </Button>

            {syncResult && (
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-2">
                <p className="text-sm font-medium">Resultado da Sincronização:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Total: <span className="font-semibold">{syncResult.total}</span></div>
                  <div>Novos: <span className="font-semibold text-success">{syncResult.new}</span></div>
                  <div>Atualizados: <span className="font-semibold text-info">{syncResult.updated}</span></div>
                  <div>Erros: <span className="font-semibold text-destructive">{syncResult.errors}</span></div>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              ⚠️ Pedidos sincronizados NÃO receberão mensagens do WhatsApp automaticamente
            </p>
          </CardContent>
        </Card>

        {/* Tag Settings */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Tag de Confirmação
            </CardTitle>
            <CardDescription>
              Configure a tag adicionada aos pedidos confirmados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirmationTag">Nome da Tag</Label>
              <Input
                id="confirmationTag"
                placeholder="cod_confirmed"
                value={confirmationTag}
                onChange={(e) => setConfirmationTag(e.target.value)}
                className="max-w-[300px]"
              />
              <p className="text-sm text-muted-foreground">
                Esta tag será adicionada ao pedido na Shopify quando o cliente confirmar
              </p>
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
              <p className="text-sm font-medium mb-2">Preview da Tag</p>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                {confirmationTag || "cod_confirmed"}
              </Badge>
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
    </MainLayout>
  );
}
