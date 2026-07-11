select
  id as raw_coin_id,
  payload_jsonb ->> 'id' as coin_id,
  payload_jsonb ->> 'symbol' as symbol,
  payload_jsonb ->> 'name' as name,
  payload_jsonb -> 'platforms' as platforms_jsonb,
  endpoint as raw_endpoint,
  created_at as raw_created_at,
  updated_at as raw_updated_at,
  deleted_at as raw_deleted_at,
  payload_jsonb as raw_payload_jsonb
from {{ source('coingecko', 'raw_coingecko__coins_list') }}
