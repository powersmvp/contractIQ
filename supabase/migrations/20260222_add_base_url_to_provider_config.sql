-- Migration: Add base_url column to provider_config
-- Allows users to point each provider to a custom LLM endpoint (e.g. Azure OpenAI, local proxy)
-- Run this in the Supabase Dashboard → SQL Editor

ALTER TABLE provider_config ADD COLUMN IF NOT EXISTS base_url TEXT;
