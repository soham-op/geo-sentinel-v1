-- Add whatsapp_number column to audits table
ALTER TABLE audits ADD COLUMN IF NOT EXISTS whatsapp_number text;
