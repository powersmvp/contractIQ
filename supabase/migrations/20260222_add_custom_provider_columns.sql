-- Migration: Add display_name and is_custom columns to provider_config
-- Supports generic OpenAI-compatible providers alongside the 5 native LLMs
-- Run this in the Supabase Dashboard → SQL Editor

ALTER TABLE provider_config
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT false;
