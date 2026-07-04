CREATE SCHEMA IF NOT EXISTS coingecko;
CREATE SCHEMA IF NOT EXISTS alphavantage;
CREATE SCHEMA IF NOT EXISTS custom_csv;

CREATE TABLE IF NOT EXISTS coingecko.raw_coingecko__coins_list (
  id text PRIMARY KEY,
  endpoint text NOT NULL,
  payload_jsonb jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS coingecko.raw_coingecko__asset_platforms_list (
  id text PRIMARY KEY,
  endpoint text NOT NULL,
  payload_jsonb jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS coingecko.raw_coingecko__trending_search (
  id text PRIMARY KEY,
  endpoint text NOT NULL,
  payload_jsonb jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS coingecko.raw_coingecko__crypto_global (
  id text PRIMARY KEY,
  endpoint text NOT NULL,
  payload_jsonb jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS coingecko.raw_coingecko__derivatives_exchanges (
  id text PRIMARY KEY,
  endpoint text NOT NULL,
  payload_jsonb jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS coingecko.raw_coingecko__exchanges (
  id text PRIMARY KEY,
  endpoint text NOT NULL,
  payload_jsonb jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS coingecko.raw_coingecko__coins_categories (
  id text PRIMARY KEY,
  endpoint text NOT NULL,
  payload_jsonb jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS coingecko.raw_coingecko__coins_id_history (
  id text PRIMARY KEY,
  endpoint text NOT NULL,
  payload_jsonb jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS coingecko.raw_coingecko__coins_id_ohlc (
  id text PRIMARY KEY,
  endpoint text NOT NULL,
  payload_jsonb jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS alphavantage.raw_alphavantage__daily_stock_ohlcv (
  id text PRIMARY KEY,
  endpoint text NOT NULL,
  payload_jsonb jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS custom_csv.raw_custom_csv__economic_time_series (
  id text PRIMARY KEY,
  entity text NOT NULL,
  csv_path text NOT NULL,
  header_shape jsonb NOT NULL,
  row_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS custom_csv.raw_custom_csv__crypto_ohlcv (
  id text PRIMARY KEY,
  entity text NOT NULL,
  csv_path text NOT NULL,
  header_shape jsonb NOT NULL,
  row_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
