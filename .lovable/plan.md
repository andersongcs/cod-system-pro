

# Sistema de Confirmação de Pedidos COD

Um sistema moderno e elegante para confirmar pedidos Cash on Delivery (COD) via WhatsApp, integrado com sua loja Shopify.

---

## 🎨 Design & Experiência

**Interface dark mode premium** com visual high-end, animações suaves e uma experiência fluida em todas as seções.

---

## 📊 Dashboard Principal

O coração do sistema com visão completa das operações:

- **Cards de métricas em tempo real**: pedidos pendentes, confirmados, cancelados
- **Taxa de conversão COD** com gráfico de evolução
- **Faturamento confirmado** do período
- **Gráficos interativos** mostrando tendências diárias/semanais
- **Lista de pedidos recentes** com status visual (pendente, confirmado, cancelado, aguardando resposta)
- **Ações rápidas**: reenviar mensagem, ver detalhes, marcar manualmente

---

## 📱 Gestão de Pedidos

Área dedicada para gerenciar todos os pedidos:

- **Tabela completa** com filtros por status, data, valor
- **Busca por cliente** ou número do pedido
- **Timeline do pedido**: quando entrou, quando foi enviada mensagem, resposta recebida
- **Ação manual**: botão para reenviar mensagem em caso de falha
- **Visualização de detalhes**: itens, endereço, valor, histórico de mensagens

---

## ⚙️ Configurações - Conexão Shopify

Página para gerenciar a integração com sua loja:

- **Status da conexão** com indicador visual
- **Sincronização de pedidos** (automática via webhook)
- **Configuração de filtros**: quais pedidos disparam o fluxo (ex: apenas COD, valor mínimo)
- **Tag de confirmação**: configurar o texto da tag (padrão: cod_confirmed)

---

## 💬 Configurações - Conexão WhatsApp

Gerenciamento da conexão WhatsApp:

- **QR Code** para escanear e conectar
- **Status da conexão** em tempo real (conectado/desconectado)
- **Número conectado** visível
- **Botão de reconectar** se a sessão expirar
- **Log de conexão** para troubleshooting

---

## ✉️ Templates de Mensagens

Editor de mensagens personalizadas:

- **Mensagem de confirmação inicial** com variáveis:
  - `{{nome_cliente}}` - Nome do cliente
  - `{{numero_pedido}}` - Número do pedido
  - `{{itens}}` - Lista de produtos
  - `{{endereco}}` - Endereço de entrega
  - `{{valor_total}}` - Valor do pedido
  - `{{link_rastreio}}` - Link de rastreamento

- **Opções interativas**: botões de Confirmar, Cancelar, Atualizar Endereço
- **Mensagem de confirmação bem-sucedida**
- **Mensagem de cancelamento**
- **Preview em tempo real** da mensagem formatada

---

## 🔄 Fluxo Automático

Configuração do comportamento automático:

- **Delay de envio**: 1 minuto após pedido entrar (configurável)
- **Tentativas de reenvio** em caso de falha
- **Horário de funcionamento**: definir horários para não enviar mensagens de madrugada
- **Log de atividades** com todas as ações do sistema

---

## 🔧 Arquitetura Técnica (Backend necessário)

Para o WhatsApp via QR Code funcionar, será necessário um **servidor backend separado**:

- Servidor Node.js com whatsapp-web.js mantendo sessão ativa
- API REST para comunicação com o frontend Lovable
- Webhook da Shopify para receber pedidos novos
- Fila de mensagens com delay configurável

O frontend Lovable se comunicará com esse backend via Edge Functions do Supabase.

---

## 📋 Resumo das Funcionalidades

| Recurso | Descrição |
|---------|-----------|
| Dashboard | Métricas, gráficos e visão geral |
| Pedidos | Lista completa com ações manuais |
| Shopify | Conexão e sincronização de pedidos |
| WhatsApp | QR Code e gestão de sessão |
| Mensagens | Templates personalizáveis com variáveis |
| Automação | Delay de 1min, horários, retentativas |

