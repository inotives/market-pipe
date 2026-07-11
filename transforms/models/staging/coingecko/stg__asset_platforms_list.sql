select
  id as raw_asset_platform_id,
  nullif(payload_jsonb ->> 'id', '') as asset_platform_id,
  cast(nullif(payload_jsonb ->> 'chain_identifier', '') as integer) as chain_identifier,
  payload_jsonb ->> 'name' as name,
  payload_jsonb ->> 'shortname' as shortname,
  payload_jsonb ->> 'native_coin_id' as native_coin_id,
  payload_jsonb ->> 'image' as image_url,
  endpoint as raw_endpoint,
  created_at as raw_created_at,
  updated_at as raw_updated_at,
  deleted_at as raw_deleted_at,
  payload_jsonb as raw_payload_jsonb
from {{ source('coingecko', 'raw_coingecko__asset_platforms_list') }}
