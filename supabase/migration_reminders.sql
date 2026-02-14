-- Migration: Add reminder tracking fields to orders table
-- This allows tracking when reminder messages were sent

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS first_reminder_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS second_reminder_sent_at TIMESTAMPTZ;

-- Add index for efficient querying of orders needing reminders
CREATE INDEX IF NOT EXISTS idx_orders_awaiting_response 
ON orders(status, message_sent_at) 
WHERE status = 'awaiting_response';

COMMENT ON COLUMN orders.first_reminder_sent_at IS 'Timestamp when first reminder (2h) was sent';
COMMENT ON COLUMN orders.second_reminder_sent_at IS 'Timestamp when second reminder (6h) was sent';
