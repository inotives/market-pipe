select
  coin_id,
  symbol,
  name,
  platforms_jsonb,
  raw_coin_id,
  raw_endpoint,
  raw_created_at,
  raw_updated_at,
  raw_deleted_at,
  raw_payload_jsonb
from {{ ref('stg_coingecko__coins_list') }}
