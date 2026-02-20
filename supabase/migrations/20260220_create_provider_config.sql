-- Migration: Create provider_config table
-- Run this in the Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS provider_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  provider_name TEXT NOT NULL,
  api_key TEXT NOT NULL,
  selected_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, provider_name)
);

ALTER TABLE provider_config ENABLE ROW LEVEL SECURITY;
