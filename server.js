import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode';
import cron from 'node-cron';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware to capture the raw body for HMAC verification
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

app.use(cors());

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY; // Using public key for client-side like ops, but for server usually service role is better. 
// However, the user provided anon key in .env. Let's use that for now.
// If RLS allows insert for anon, it works. We added policies for that.

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- WhatsApp Client Setup ---
const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-default-apps',
            '--mute-audio',
            '--no-default-browser-check'
        ],
    }
});

let qrCodeData = null;
let isWhatsappReady = false;
let connectionLog = 'Initializing...';

whatsappClient.on('qr', async (qr) => {
    connectionLog = 'QR Code received. Generating image...';
    console.log(connectionLog);
    try {
        qrCodeData = await qrcode.toDataURL(qr);
        connectionLog = 'QR Code generated successfully. Waiting for scan...';
        console.log(connectionLog);
    } catch (err) {
        connectionLog = `Error generating QR: ${err.message}`;
        console.error(connectionLog);
    }
});

whatsappClient.on('loading_screen', (percent, message) => {
    connectionLog = `WhatsApp Loading: ${percent}% - ${message}`;
    console.log(connectionLog);
});

whatsappClient.on('auth_failure', (msg) => {
    connectionLog = `Auth Failure: ${msg}`;
    console.error(connectionLog);
});

whatsappClient.on('change_state', (state) => {
    connectionLog = `State Changed: ${state}`;
    console.log(connectionLog);
});

whatsappClient.on('ready', () => {
    connectionLog = 'WhatsApp Client is ready!';
    console.log(connectionLog);
    isWhatsappReady = true;
    qrCodeData = null;
});

whatsappClient.on('authenticated', () => {
    connectionLog = 'WhatsApp Authenticated';
    console.log(connectionLog);
});

whatsappClient.on('disconnected', (reason) => {
    connectionLog = `Disconnected: ${reason}`;
    console.log(connectionLog);
    isWhatsappReady = false;
});

// Initialize WhatsApp
console.log('Initializing WhatsApp Client...');
whatsappClient.initialize().then(() => {
    connectionLog = 'WhatsApp Client init promise resolved. Waiting for browser...';
    console.log(connectionLog);
}).catch(err => {
    connectionLog = `Init Failed: ${err.message}`;
    console.error(connectionLog);
});

// --- API Endpoints for WhatsApp ---

app.get('/api/whatsapp/status', (req, res) => {
    res.json({
        connected: isWhatsappReady,
        qr: qrCodeData,
        info: isWhatsappReady ? whatsappClient.info : null,
        message: connectionLog
    });
});

app.post('/api/whatsapp/disconnect', async (req, res) => {
    try {
        if (isWhatsappReady) {
            await whatsappClient.logout();
            res.json({ success: true, message: 'Disconnected successfully' });
        } else {
            res.status(400).json({ success: false, message: 'Not connected' });
        }
    } catch (err) {
        console.error('Error disconnecting:', err);
        res.status(500).json({ success: false, message: 'Error disconnecting' });
    }
});


// HMAC Verification Helper
const verifyShopifyWebhook = async (req) => {
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
    const shopDomain = req.get('X-Shopify-Shop-Domain');

    if (!hmacHeader || !shopDomain) return false;

    // Retrieve the secret for this shop from Supabase
    const { data: config } = await supabase
        .from('shopify_configs')
        .select('webhook_secret')
        .eq('shop_url', shopDomain) // Assuming shop_url matches the header or we query by active. 
        // Actually, usually we might have one shop per app instance or identifying by header. 
        // Let's simplified: fetch the active config for now as we likely have one.
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!config || !config.webhook_secret) {
        console.error('No webhook secret found for shop:', shopDomain);
        return false;
    }

    const digest = crypto
        .createHmac('sha256', config.webhook_secret)
        .update(req.rawBody)
        .digest('base64');

    return digest === hmacHeader;
};

// Match both the generic and specific "orders/create" path
app.post(['/api/webhooks/shopify', '/api/webhooks/shopify/orders/create'], async (req, res) => {
    console.log('Received webhook request...'); // Log receipt

    try {
        const isValid = await verifyShopifyWebhook(req);

        // For development, we might want to skip verification if secret is not set clearly, 
        // but better to enforce it if possible. 
        // Since user inputs secret in settings, we should try to use it.

        if (!isValid) {
            console.warn('Invalid HMAC signature or missing secret');
            // For testing without valid HMAC (e.g. manual curl), we might fail here.
            // But let's proceed with 401 if invalid.
            res.status(401).send('Invalid signature');
            return;
        }

        const order = req.body;
        console.log('Processing order:', order.name || order.id);

        // Prepare data for Supabase
        // We map Shopify order fields to our schema
        const orderData = {
            shopify_order_id: `gid://shopify/Order/${order.id}`,
            order_number: String(order.order_number),
            customer_name: order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Guest',
            customer_email: order.email || order.contact_email,
            customer_phone: order.phone || (order.customer && order.customer.phone) || (order.billing_address && order.billing_address.phone),
            total_value: Number(order.total_price),
            currency: order.currency,
            status: 'pending', // Default status for new orders
            financial_status: order.financial_status,
            fulfillment_status: order.fulfillment_status,
            payment_gateway: order.gateway,
            address: order.shipping_address ? JSON.stringify(order.shipping_address) : JSON.stringify(order.billing_address),
            items: order.line_items ? order.line_items.map(item => ({
                id: String(item.id),
                name: item.name,
                quantity: item.quantity,
                price: Number(item.price),
                sku: item.sku,
                variant: item.variant_title
            })) : [],
            timeline: [{
                action: 'Pedido criado',
                timestamp: new Date().toISOString(),
                details: 'Recebido via Webhook'
            }]
        };

        // Insert Order
        /* 
           Note: Our schema separates items into a separate table.
           So we insert order first, get ID, then insert items.
        */

        // Check if order exists
        const { data: existingOrder } = await supabase
            .from('orders')
            .select('id')
            .eq('shopify_order_id', orderData.shopify_order_id)
            .maybeSingle();

        let insertedOrder;
        let orderError;

        if (existingOrder) {
            // Update existing order
            const { data, error } = await supabase
                .from('orders')
                .update({
                    order_number: orderData.order_number,
                    customer_name: orderData.customer_name,
                    customer_email: orderData.customer_email,
                    customer_phone: orderData.customer_phone,
                    total_value: orderData.total_value,
                    currency: orderData.currency,
                    status: orderData.status,
                    address: orderData.address,
                    timeline: JSON.stringify(orderData.timeline)
                })
                .eq('id', existingOrder.id)
                .select()
                .single();

            insertedOrder = data;
            orderError = error;
        } else {
            // Insert new order
            const { data, error } = await supabase
                .from('orders')
                .insert({
                    shopify_order_id: orderData.shopify_order_id,
                    order_number: orderData.order_number,
                    customer_name: orderData.customer_name,
                    customer_email: orderData.customer_email,
                    customer_phone: orderData.customer_phone,
                    total_value: orderData.total_value,
                    currency: orderData.currency,
                    status: orderData.status,
                    address: orderData.address,
                    timeline: JSON.stringify(orderData.timeline)
                })
                .select()
                .single();

            insertedOrder = data;
            orderError = error;
        }

        if (orderError) {
            console.error('Error inserting order:', orderError);
            res.status(500).send('Database error');
            return;
        }

        // Insert Items
        if (orderData.items.length > 0 && insertedOrder) {
            console.log(`[ITEMS] Processing ${orderData.items.length} items for order ${orderData.order_number}`);

            // Delete existing items first to avoid duplicates
            await supabase.from('items').delete().eq('order_id', insertedOrder.id);

            const itemsToInsert = orderData.items.map(item => ({
                order_id: insertedOrder.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                sku: item.sku,
                variant: item.variant
            }));

            console.log(`[ITEMS] Inserting items:`, JSON.stringify(itemsToInsert, null, 2));

            const { error: itemsError } = await supabase
                .from('items')
                .insert(itemsToInsert);

            if (itemsError) {
                console.error('Error inserting items:', itemsError);
            } else {
                console.log(`[ITEMS] Successfully inserted ${itemsToInsert.length} items`);
            }
        }

        console.log(`Order ${orderData.order_number} processed successfully.`);

        // Send WhatsApp Confirmation
        if (insertedOrder) {
            // Only send if not already sent
            if (!insertedOrder.message_sent_at) {
                // Re-fetch items if needed, or pass constructed object with items
                const fullOrderForMsg = { ...insertedOrder, items: orderData.items };
                await sendWhatsAppConfirmation(fullOrderForMsg);
            }
        }

        res.status(200).send('OK');

    } catch (err) {
        console.error('Webhook handler error:', err);
        res.status(500).send('Server Error');
    }
});

// --- Shopify Order Sync Endpoint ---
app.post('/api/shopify/sync-orders', async (req, res) => {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    try {
        console.log(`[SYNC] Starting sync for ${startDate} to ${endDate}`);

        // Fetch Shopify config
        const { data: config, error: configError } = await supabase
            .from('shopify_configs')
            .select('*')
            .limit(1)
            .single();

        if (configError || !config) {
            return res.status(500).json({ error: 'Shopify config not found' });
        }

        const shopDomain = config.shop_url;
        const accessToken = config.access_token;

        // Fetch orders from Shopify
        const created_at_min = `${startDate}T00:00:00-03:00`;
        const created_at_max = `${endDate}T23:59:59-03:00`;

        const shopifyUrl = `https://${shopDomain}/admin/api/2024-01/orders.json?created_at_min=${created_at_min}&created_at_max=${created_at_max}&limit=250&status=any`;

        const response = await fetch(shopifyUrl, {
            headers: {
                'X-Shopify-Access-Token': accessToken
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[SYNC] Shopify API error:', errorText);
            return res.status(500).json({ error: 'Failed to fetch orders from Shopify' });
        }

        const { orders } = await response.json();
        console.log(`[SYNC] Found ${orders.length} orders`);

        let newOrders = 0;
        let updatedOrders = 0;
        let errors = 0;

        // Process each order
        for (const shopifyOrder of orders) {
            try {
                const orderData = {
                    shopify_order_id: `gid://shopify/Order/${shopifyOrder.id}`,
                    order_number: shopifyOrder.name || shopifyOrder.order_number?.toString() || 'N/A',
                    customer_name: shopifyOrder.customer?.first_name && shopifyOrder.customer?.last_name
                        ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}`
                        : shopifyOrder.customer?.first_name || 'Cliente',
                    customer_phone: shopifyOrder.customer?.phone || shopifyOrder.shipping_address?.phone || '',
                    customer_email: shopifyOrder.customer?.email || '',
                    address: JSON.stringify(shopifyOrder.shipping_address || {}),
                    total_value: parseFloat(shopifyOrder.total_price || 0),
                    currency: shopifyOrder.currency || 'COP',
                    status: 'pending',
                };

                // Check if order exists
                const { data: existingOrder } = await supabase
                    .from('orders')
                    .select('id')
                    .eq('shopify_order_id', orderData.shopify_order_id)
                    .maybeSingle();

                let insertedOrder;

                if (existingOrder) {
                    // Update existing order
                    const { data, error } = await supabase
                        .from('orders')
                        .update(orderData)
                        .eq('id', existingOrder.id)
                        .select()
                        .single();

                    if (error) throw error;
                    insertedOrder = data;
                    updatedOrders++;
                } else {
                    // Insert new order
                    const { data, error } = await supabase
                        .from('orders')
                        .insert(orderData)
                        .select()
                        .single();

                    if (error) throw error;
                    insertedOrder = data;
                    newOrders++;
                }

                // Insert items
                if (shopifyOrder.line_items && shopifyOrder.line_items.length > 0) {
                    // Delete existing items first
                    await supabase.from('items').delete().eq('order_id', insertedOrder.id);

                    const items = shopifyOrder.line_items.map(item => ({
                        order_id: insertedOrder.id,
                        name: item.name || item.title || 'Item',
                        quantity: item.quantity || 1,
                        price: parseFloat(item.price || 0),
                        sku: item.sku || '',
                        variant: item.variant_title || ''
                    }));

                    await supabase.from('items').insert(items);
                }

                console.log(`[SYNC] Processed order ${orderData.order_number}`);

            } catch (err) {
                console.error(`[SYNC] Error processing order:`, err);
                errors++;
            }
        }

        res.json({
            success: true,
            summary: {
                total: orders.length,
                new: newOrders,
                updated: updatedOrders,
                errors: errors
            }
        });

    } catch (err) {
        console.error('[SYNC] Sync failed:', err);
        res.status(500).json({ error: 'Sync failed', details: err.message });
    }
});

// Helper to format currency
const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

// Random delay between 1-2 minutes to avoid bot detection
const randomDelay = () => {
    const min = 60000; // 1 minute
    const max = 120000; // 2 minutes
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`[ANTI-BOT] Waiting ${Math.floor(delay / 1000)}s before responding...`);
    return new Promise(resolve => setTimeout(resolve, delay));
};

// --- Incoming Message Listener ---
// Using message_create to serve both external messages AND self-messages (for testing)
whatsappClient.on('message_create', async msg => {
    try {
        const body = msg.body.trim();

        // Log for debug
        console.log(`[DEBUG] Msg: ${body} | FromMe: ${msg.fromMe} | From: ${msg.from} | To: ${msg.to}`);

        // We want to handle "1", "2", "3" regardless of who sent it (User or Self-Test)
        if (['1', '2', '3'].includes(body)) {

            // Determine the "customer phone"
            // If fromMe (I sent '1'), the customer is ME (msg.to is the other person? No, in self chat msg.to is also me or from is me)
            // In a "Self Chat" (Note to Self): from=me, to=me.
            // In a chat with Customer:
            //   - Customer sends '1': from=customer, fromMe=false
            //   - I send '1' (testing): from=me, to=customer. 

            // FIXED LOGIC:
            // Resolve contact to get the real phone number (handles @lid and @c.us)
            const contact = await msg.getContact();
            const targetPhone = contact.number || contact.id.user;

            // Match order by phone (endsWith logic)
            const last8Digits = targetPhone.slice(-8);

            connectionLog = `Received '${body}' from ${targetPhone}. Checking orders ending in ${last8Digits}...`;
            console.log(connectionLog);

            const { data: pendingOrders, error } = await supabase
                .from('orders')
                .select('*')
                .eq('status', 'awaiting_response')
                .order('created_at', { ascending: false });

            if (error || !pendingOrders) {
                console.error('Error fetching pending orders:', error);
                return;
            }

            const order = pendingOrders.find(o => {
                const dbPhone = o.customer_phone?.replace(/\D/g, '') || '';
                const match = dbPhone.endsWith(last8Digits);
                if (match) {
                    console.log(`[MATCH] Found order ${o.order_number} for phone ${dbPhone}`);
                }
                return match;
            });

            if (!order) {
                connectionLog = `No pending order found for phone ending in ${last8Digits}. (Checked ${pendingOrders.length} pending orders)`;
                console.log(connectionLog);
            }

            if (order) {
                if (body === '1') {
                    // Confirm Order
                    await supabase.from('orders').update({
                        status: 'confirmed',
                        response_received_at: new Date().toISOString()
                    }).eq('id', order.id);

                    // Update Shopify Tag
                    updateShopifyTag(order.shopify_order_id, 'Confirmado');

                    // Anti-bot delay before responding
                    await randomDelay();

                    // Fetch confirmed template
                    const { data: confirmedTemplate } = await supabase
                        .from('message_templates')
                        .select('content')
                        .eq('id', 'confirmed')
                        .single();

                    const confirmedMessage = confirmedTemplate?.content || '✅ Pedido confirmado com sucesso! Logo enviaremos o rastreio.';
                    await whatsappClient.sendMessage(msg.from, replaceMessageVariables(confirmedMessage, order));
                    console.log(`Order ${order.order_number} confirmed by ${msg.fromMe ? 'SELF' : 'CUSTOMER'}.`);

                } else if (body === '2') {
                    // Cancel Order
                    await supabase.from('orders').update({
                        status: 'cancelled',
                        response_received_at: new Date().toISOString()
                    }).eq('id', order.id);

                    // Cancel in Shopify (Restock)
                    const cancelled = await cancelShopifyOrder(order.shopify_order_id);

                    // Anti-bot delay before responding
                    await randomDelay();

                    // Fetch cancelled template
                    const { data: cancelledTemplate } = await supabase
                        .from('message_templates')
                        .select('content')
                        .eq('id', 'cancelled')
                        .single();

                    const cancelledMessage = cancelledTemplate?.content || '❌ Pedido cancelado e estornado na loja com sucesso.';
                    await whatsappClient.sendMessage(msg.from, replaceMessageVariables(cancelledMessage, order));
                    console.log(`Order ${order.order_number} cancelled.`);

                } else if (body === '3') {
                    // Update Address
                    // Anti-bot delay before responding
                    await randomDelay();

                    // Fetch address update template
                    const { data: addressTemplate } = await supabase
                        .from('message_templates')
                        .select('content')
                        .eq('id', 'address_update')
                        .single();

                    const addressMessage = addressTemplate?.content || '📍 Por favor, envie o novo endereço completo nesta conversa.';
                    await whatsappClient.sendMessage(msg.from, replaceMessageVariables(addressMessage, order));
                }
            }
        }
    } catch (err) {
        console.error('Error processing msg:', err);
    }
});


// --- WhatsApp Message Logic ---

// Helper to replace variables in messages
const replaceMessageVariables = (message, order, itemsList = '') => {
    if (!message) return '';

    // Random Greeting
    const greetings = [
        "Hola",
        "Buenos días",
        "Buenas tardes",
        "Buenas noches",
        "Saludos",
        "Hola, ¿cómo estás?"
    ];
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

    const addressStr = order.address ? (JSON.parse(order.address).address1 || 'Dirección no informada') : 'Dirección no informada';

    return message
        .replace(/\{greeting\}/g, randomGreeting)
        .replace(/\{\{greeting\}\}/g, randomGreeting)
        .replace(/\{nome_cliente\}/g, order.customer_name)
        .replace(/\{\{nome_cliente\}\}/g, order.customer_name)
        .replace(/\{orderNumber\}/g, order.order_number)
        .replace(/\{\{orderNumber\}\}/g, order.order_number)
        .replace(/\{\{numero_pedido\}\}/g, order.order_number)
        .replace(/\{items\}/g, itemsList)
        .replace(/\{\{items\}\}/g, itemsList)
        .replace(/\{\{itens\}\}/g, itemsList)
        .replace(/\{address\}/g, addressStr)
        .replace(/\{\{address\}\}/g, addressStr)
        .replace(/\{\{endereco\}\}/g, addressStr)
        .replace(/\{total\}/g, formatCurrency(order.total_value))
        .replace(/\{\{total\}\}/g, formatCurrency(order.total_value))
        .replace(/\{\{valor_total\}\}/g, formatCurrency(order.total_value));
};

const sendWhatsAppConfirmation = async (order) => {
    if (!isWhatsappReady) {
        console.log('WhatsApp client not ready, skipping message.');
        return false;
    }

    try {
        // Format phone number (ensure it has country code, remove non-digits)
        let phone = order.customer_phone?.replace(/\D/g, '') || '';

        // Brazilian Number Logic (55)
        if (phone.startsWith('55') && phone.length === 13 && phone[4] === '9') {
            // Sometimes whatsapp-web.js prefers the format WITHOUT the 9 for connections, 
            // but usually WITH the 9 for sending to non-contacts.
            // However, specifically for "c.us" IDs, it's safer to try maintaining the standard.
            // Let's rely on what the user provided but sanitized. 
        }

        // Colombian Number Logic (add 57 if missing)
        if (phone.length === 10) {
            phone = '57' + phone;
        }

        // WhatsApp ID format
        // Use getNumberId to resolve the correct ID (handles the 9 digit issue automatically)
        let chatId;
        try {
            const result = await whatsappClient.getNumberId(phone);
            if (!result) {
                console.log(`[DEBUG] Number not registered on WhatsApp: ${phone}`);
                return false;
            }
            chatId = result._serialized;
            console.log(`[DEBUG] Resolved ChatID: ${chatId}`);
        } catch (idErr) {
            // Fallback for some business accounts or if getNumberId fails
            console.log('[DEBUG] getNumberId failed, falling back to manual construction');
            chatId = `${phone}@c.us`;
        }

        console.log(`[DEBUG] Final Target ChatID: ${chatId}`);

        // Fetch template from database
        const { data: templateData, error: templateError } = await supabase
            .from('message_templates')
            .select('content')
            .eq('id', 'confirmation')
            .single();

        if (templateError || !templateData) {
            console.error('Error fetching template:', templateError);
            // Fallback to default if template not found
        }

        // Format Items list - Group duplicate items by name
        const itemsMap = {};
        order.items.forEach(item => {
            if (itemsMap[item.name]) {
                itemsMap[item.name].quantity += item.quantity;
            } else {
                itemsMap[item.name] = {
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price
                };
            }
        });

        const itemsList = Object.values(itemsMap).map(i =>
            `- ${i.quantity}x ${i.name} (${formatCurrency(i.price)})`
        ).join('\n');

        // Use template from database or fallback
        let message = templateData?.content || `Olá {{nome_cliente}}! 👋

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

Aguardamos sua resposta!`;

        // Helper usage
        message = replaceMessageVariables(message, order, itemsList);

        console.log('[DEBUG] Sending message...');
        await whatsappClient.sendMessage(chatId, message);
        console.log(`[DEBUG] Message sent to ${chatId}`);

        // Update database to mark message as sent
        await supabase.from('orders').update({
            message_sent_at: new Date().toISOString(),
            status: 'awaiting_response' // Pending confirmation
        }).eq('id', order.id);

        return true;

    } catch (err) {
        console.error('Error sending WhatsApp message:', err);
        return false;
    }
};

app.post('/api/whatsapp/send-confirmation', async (req, res) => {
    const { orderId } = req.body;

    if (!orderId) return res.status(400).send('Missing orderId');

    try {
        const { data: order, error } = await supabase
            .from('orders')
            .select('*, items(*)')
            .eq('id', orderId)
            .single();

        if (error || !order) {
            return res.status(404).send('Order not found');
        }

        const sent = await sendWhatsAppConfirmation(order);
        if (sent) {
            res.json({ success: true, message: 'Message sent' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to send or WhatsApp not ready' });
        }

    } catch (err) {
        console.error('Manual send error:', err);
        res.status(500).send('Server Error');
    }
});

// Helper to cancel Shopify Order
const cancelShopifyOrder = async (shopifyOrderId) => {
    try {
        const orderId = shopifyOrderId.split('/').pop();

        const { data: config } = await supabase
            .from('shopify_configs')
            .select('*')
            .limit(1)
            .single();

        if (!config) {
            console.error('No Shopify config found for cancellation.');
            return false;
        }

        const shopDomain = config.shop_url;
        const accessToken = config.access_token;

        // Cancel Order on Shopify (and restock items)
        const response = await fetch(`https://${shopDomain}/admin/api/2024-01/orders/${orderId}/cancel.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': accessToken
            },
            // Empty body usually implies default restock behavior, but let's be explicit if needed.
            // By default Shopify restocks items.
            body: JSON.stringify({})
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Failed to cancel Shopify order:', errText);
            return false;
        }

        console.log(`Order ${orderId} cancelled on Shopify.`);
        return true;

    } catch (err) {
        console.error('Error cancelling Shopify order:', err);
        return false;
    }
};

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// --- Serve Static Frontend (Production) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distPath = join(__dirname, 'dist');

app.use(express.static(distPath));

// Catch-all handler for any request that doesn't match an API route
app.get(/(.*)/, (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(join(distPath, 'index.html'));
});

app.listen(port, () => {
    console.log(`Webhook server running at http://localhost:${port}`);
});

// --- Automated Reminder System ---
// Run every 15 minutes to check for orders needing reminders
cron.schedule('*/15 * * * *', async () => {
    if (!isWhatsappReady) {
        console.log('[REMINDER] WhatsApp not ready, skipping reminder check');
        return;
    }

    console.log('[REMINDER] Checking for orders needing reminders...');

    try {
        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

        // Fetch orders awaiting response
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*, items(*)')
            .eq('status', 'awaiting_response')
            .not('message_sent_at', 'is', null);

        if (error) {
            console.error('[REMINDER] Error fetching orders:', error);
            return;
        }

        if (!orders || orders.length === 0) {
            console.log('[REMINDER] No orders awaiting response');
            return;
        }

        console.log(`[REMINDER] Found ${orders.length} orders awaiting response`);

        for (const order of orders) {
            const messageSentAt = new Date(order.message_sent_at);
            const firstReminderSentAt = order.first_reminder_sent_at ? new Date(order.first_reminder_sent_at) : null;

            // Check if first reminder should be sent (2 hours after initial message)
            if (!firstReminderSentAt && messageSentAt <= twoHoursAgo) {
                console.log(`[REMINDER] Sending first reminder for order ${order.order_number}`);
                await sendReminder(order, 'first_reminder');

                // Update database
                await supabase
                    .from('orders')
                    .update({ first_reminder_sent_at: new Date().toISOString() })
                    .eq('id', order.id);
            }
            // Check if second reminder should be sent (4 hours after first reminder = 6 hours total)
            else if (firstReminderSentAt && !order.second_reminder_sent_at && firstReminderSentAt <= new Date(now.getTime() - 4 * 60 * 60 * 1000)) {
                console.log(`[REMINDER] Sending second (urgent) reminder for order ${order.order_number}`);
                await sendReminder(order, 'second_reminder');

                // Update database
                await supabase
                    .from('orders')
                    .update({ second_reminder_sent_at: new Date().toISOString() })
                    .eq('id', order.id);
            }
        }

        // Check for orders to auto-cancel (24 hours after initial message)
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const ordersToCancel = orders.filter(order => {
            const messageSentAt = new Date(order.message_sent_at);
            return !order.auto_cancelled_at && messageSentAt <= twentyFourHoursAgo;
        });

        for (const order of ordersToCancel) {
            console.log(`[AUTO-CANCEL] Auto-cancelling order ${order.order_number} (24h timeout)`);
            await autoCancelOrder(order);
        }

        console.log('[REMINDER] Reminder check completed');
    } catch (err) {
        console.error('[REMINDER] Error in reminder cron job:', err);
    }
});

// Helper function to send reminder messages
const sendReminder = async (order, templateId) => {
    try {
        // Fetch template from database
        const { data: templateData, error: templateError } = await supabase
            .from('message_templates')
            .select('content')
            .eq('id', templateId)
            .single();

        if (templateError || !templateData) {
            console.error(`[REMINDER] Error fetching template ${templateId}:`, templateError);
            return false;
        }

        // Format phone number
        let phone = order.customer_phone?.replace(/\D/g, '') || '';

        if (phone.startsWith('55') && phone.length === 13 && phone[4] === '9') {
            // Brazilian number logic
        }

        if (phone.length === 10) {
            phone = '57' + phone;
        }

        // Resolve WhatsApp ID
        let chatId;
        try {
            const result = await whatsappClient.getNumberId(phone);
            if (!result) {
                console.log(`[REMINDER] Number not registered: ${phone}`);
                return false;
            }
            chatId = result._serialized;
        } catch (idErr) {
            chatId = `${phone}@c.us`;
        }

        // Replace variables in template
        let message = replaceMessageVariables(templateData.content, order);

        // Add anti-bot delay
        await randomDelay();

        // Send message
        await whatsappClient.sendMessage(chatId, message);
        console.log(`[REMINDER] Reminder sent to ${chatId} for order ${order.order_number}`);

        return true;
    } catch (err) {
        console.error('[REMINDER] Error sending reminder:', err);
        return false;
    }
};

// Helper function to auto-cancel orders after 24h
const autoCancelOrder = async (order) => {
    try {
        // Update order status to cancelled
        await supabase
            .from('orders')
            .update({
                status: 'cancelled',
                auto_cancelled_at: new Date().toISOString()
            })
            .eq('id', order.id);

        // Cancel in Shopify (restock inventory)
        const shopifyCancelled = await cancelShopifyOrder(order.shopify_order_id);

        if (shopifyCancelled) {
            console.log(`[AUTO-CANCEL] Order ${order.order_number} cancelled in Shopify`);
        } else {
            console.log(`[AUTO-CANCEL] Failed to cancel order ${order.order_number} in Shopify`);
        }

        // Fetch auto-cancel template
        const { data: templateData } = await supabase
            .from('message_templates')
            .select('content')
            .eq('id', 'auto_cancelled')
            .single();

        if (!templateData) {
            console.error('[AUTO-CANCEL] Template not found');
            return false;
        }

        // Format phone number
        let phone = order.customer_phone?.replace(/\D/g, '') || '';

        if (phone.length === 10) {
            phone = '57' + phone;
        }

        // Resolve WhatsApp ID
        let chatId;
        try {
            const result = await whatsappClient.getNumberId(phone);
            if (!result) {
                console.log(`[AUTO-CANCEL] Number not registered: ${phone}`);
                return false;
            }
            chatId = result._serialized;
        } catch (idErr) {
            chatId = `${phone}@c.us`;
        }

        // Replace variables in template
        let message = templateData.content
            .replace(/\{\{nome_cliente\}\}/g, order.customer_name)
            .replace(/\{\{numero_pedido\}\}/g, order.order_number)
            .replace(/\{\{url_loja\}\}/g, 'https://lavisbogota.shop');

        // Add anti-bot delay
        await randomDelay();

        // Send message
        await whatsappClient.sendMessage(chatId, message);
        console.log(`[AUTO-CANCEL] Cancellation notification sent to ${chatId} for order ${order.order_number}`);

        return true;
    } catch (err) {
        console.error('[AUTO-CANCEL] Error auto-cancelling order:', err);
        return false;
    }
};

console.log('[REMINDER] Automated reminder system initialized (runs every 15 minutes)');

// Helper to update Shopify Tag
const updateShopifyTag = async (shopifyOrderId, newTag) => {
    try {
        // shopifyOrderId is "gid://shopify/Order/123456" -> extract ID "123456"
        const orderId = shopifyOrderId.split('/').pop();

        // Get Credentials (assuming single active shop for now, or we could store shop_url on the order record)
        const { data: config } = await supabase
            .from('shopify_configs')
            .select('*')
            .limit(1)
            .single();

        if (!config) {
            console.error('No Shopify config found for tag update.');
            return;
        }

        const shopDomain = config.shop_url;
        const accessToken = config.access_token;

        // First get current tags to append
        const getRes = await fetch(`https://${shopDomain}/admin/api/2024-01/orders/${orderId}.json?fields=tags`, {
            headers: { 'X-Shopify-Access-Token': accessToken }
        });

        if (!getRes.ok) {
            console.error('Failed to fetch existing tags from Shopify');
            return;
        }

        const getData = await getRes.json();
        const currentTags = getData.order?.tags || '';

        if (currentTags.includes(newTag)) {
            console.log('Tag already exists, skipping update.');
            return;
        }

        const updatedTags = currentTags ? `${currentTags}, ${newTag}` : newTag;

        await fetch(`https://${shopDomain}/admin/api/2024-01/orders/${orderId}.json`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': accessToken
            },
            body: JSON.stringify({
                order: {
                    id: orderId,
                    tags: updatedTags
                }
            })
        });

        console.log(`Shopify Tag updated for order ${orderId}: ${updatedTags}`);

    } catch (err) {
        console.error('Error updating Shopify tag:', err);
    }
};

// ... inside the message listener, after DB update:
// await updateShopifyTag(order.shopify_order_id, 'Confirmed');
