import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Eye, Variable, Check, X, MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
}

const defaultTemplates: MessageTemplate[] = [
  {
    id: "confirmation",
    name: "Mensagem de Confirmação",
    content: `Olá {{nome_cliente}}! 👋

Recebemos seu pedido #{{numero_pedido}} e gostaríamos de confirmar as informações:

📦 *Itens:*
{{itens}}

📍 *Endereço de entrega:*
{{endereco}}

💰 *Valor total:* {{valor_total}}

Por favor, confirme seu pedido respondendo:

✅ *1* - Confirmar pedido
❌ *2* - Cancelar pedido
📍 *3* - Atualizar endereço

Aguardamos sua resposta!`,
    variables: ["nome_cliente", "numero_pedido", "itens", "endereco", "valor_total"],
  },
  {
    id: "confirmed",
    name: "Pedido Confirmado",
    content: `Perfeito, {{nome_cliente}}! ✅

Seu pedido #{{numero_pedido}} foi *confirmado* com sucesso!

Você receberá atualizações sobre o envio em breve.

Obrigado pela preferência! 🙏`,
    variables: ["nome_cliente", "numero_pedido"],
  },
  {
    id: "cancelled",
    name: "Pedido Cancelado",
    content: `{{nome_cliente}}, seu pedido #{{numero_pedido}} foi *cancelado* conforme solicitado.

Se tiver dúvidas ou precisar de ajuda, estamos à disposição!

Esperamos vê-lo em breve. 🙌`,
    variables: ["nome_cliente", "numero_pedido"],
  },
  {
    id: "address_update",
    name: "Atualização de Endereço",
    content: `{{nome_cliente}}, por favor envie seu novo endereço completo:

📍 Rua, número e complemento
🏙️ Cidade e estado
📮 CEP

Aguardamos sua resposta para atualizar o pedido #{{numero_pedido}}.`,
    variables: ["nome_cliente", "numero_pedido"],
  },
];

const availableVariables = [
  { key: "nome_cliente", description: "Nome do cliente", example: "João Silva" },
  { key: "numero_pedido", description: "Número do pedido", example: "1001" },
  { key: "itens", description: "Lista de produtos", example: "• 2x Camiseta Básica\n• 1x Shorts" },
  { key: "endereco", description: "Endereço de entrega", example: "Rua das Flores, 123, São Paulo - SP" },
  { key: "valor_total", description: "Valor total do pedido", example: "R$ 299,90" },
  { key: "link_rastreio", description: "Link de rastreamento", example: "https://rastreio.correios.com.br/..." },
];

export default function SettingsMessages() {
  const [templates, setTemplates] = useState<MessageTemplate[]>(defaultTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate>(defaultTemplates[0]);
  const [editedContent, setEditedContent] = useState(defaultTemplates[0].content);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load templates from database on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('message_templates' as any)
        .select('*')
        .order('id');

      if (error) throw error;

      if (data && data.length > 0) {
        setTemplates(data as MessageTemplate[]);
        setSelectedTemplate(data[0] as MessageTemplate);
        setEditedContent((data[0] as MessageTemplate).content);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setEditedContent(template.content);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('message_templates' as any)
        .upsert({
          id: selectedTemplate.id,
          name: selectedTemplate.name,
          content: editedContent,
          variables: selectedTemplate.variables,
        });

      if (error) throw error;

      // Update local state
      setTemplates(templates.map(t =>
        t.id === selectedTemplate.id ? { ...t, content: editedContent } : t
      ));
      setSelectedTemplate({ ...selectedTemplate, content: editedContent });

      toast.success('Template salvo com sucesso!');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Erro ao salvar template');
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variable: string) => {
    const textArea = document.getElementById("template-editor") as HTMLTextAreaElement;
    if (textArea) {
      const start = textArea.selectionStart;
      const end = textArea.selectionEnd;
      const text = editedContent;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newContent = `${before}{{${variable}}}${after}`;
      setEditedContent(newContent);
    }
  };

  const getPreviewContent = () => {
    let content = editedContent;
    availableVariables.forEach(v => {
      content = content.replace(new RegExp(`{{${v.key}}}`, 'g'), v.example);
    });
    return content;
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates de Mensagens</h1>
          <p className="text-muted-foreground">
            Personalize as mensagens enviadas aos clientes
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Template List */}
            <div className="space-y-4">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-lg">Templates</CardTitle>
                  <CardDescription>Selecione para editar</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateChange(template)}
                      className={cn(
                        "w-full rounded-lg border border-border/50 p-3 text-left transition-all duration-200",
                        selectedTemplate.id === template.id
                          ? "bg-primary/10 border-primary/30"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {template.id === "confirmation" && <FileText className="h-4 w-4 text-primary" />}
                        {template.id === "confirmed" && <Check className="h-4 w-4 text-success" />}
                        {template.id === "cancelled" && <X className="h-4 w-4 text-destructive" />}
                        {template.id === "address_update" && <MapPin className="h-4 w-4 text-info" />}
                        <span className="font-medium">{template.name}</span>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* Variables Reference */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Variable className="h-5 w-5" />
                    Variáveis Disponíveis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {availableVariables.map((variable) => (
                    <button
                      key={variable.key}
                      onClick={() => insertVariable(variable.key)}
                      className="w-full rounded-lg border border-border/50 p-2 text-left transition-all duration-200 hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="font-mono text-xs">
                          {`{{${variable.key}}}`}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{variable.description}</p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Editor and Preview */}
            <div className="lg:col-span-2">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-lg">{selectedTemplate.name}</CardTitle>
                  <CardDescription>
                    Clique nas variáveis ao lado para inserir no texto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="editor">
                    <TabsList className="mb-4">
                      <TabsTrigger value="editor" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Editor
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="gap-2">
                        <Eye className="h-4 w-4" />
                        Preview
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="editor" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="template-editor">Conteúdo da Mensagem</Label>
                        <Textarea
                          id="template-editor"
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="min-h-[400px] font-mono text-sm"
                          placeholder="Digite o conteúdo da mensagem..."
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditedContent(selectedTemplate.content)}>
                          Restaurar Original
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Salvar Template
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="preview">
                      <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                        <div className="mb-4 flex items-center gap-2">
                          <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                            <span className="text-lg">🏪</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">Sua Loja</p>
                            <p className="text-xs text-muted-foreground">Mensagem do WhatsApp</p>
                          </div>
                        </div>
                        <div className="rounded-lg bg-card p-4 shadow-sm">
                          <pre className="whitespace-pre-wrap font-sans text-sm">
                            {getPreviewContent()}
                          </pre>
                        </div>
                        <p className="mt-4 text-xs text-muted-foreground text-center">
                          Preview com dados de exemplo
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
