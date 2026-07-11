select
  asset_platform_id,
  chain_identifier,
  name,
  shortname,
  native_coin_id,
  image_url,
  raw_asset_platform_id,
  raw_endpoint,
  raw_created_at,
  raw_updated_at,
  raw_deleted_at,
  raw_payload_jsonb
from {{ ref('stg__asset_platforms_list') }}
