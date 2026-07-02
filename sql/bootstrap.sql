CREATE SCHEMA IF NOT EXISTS coingecko;

CREATE TABLE IF NOT EXISTS coingecko.raw_coingecko__coins_list (
  id text PRIMARY KEY,
  endpoint text NOT NULL,
  payload_jsonb jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
