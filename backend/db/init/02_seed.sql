INSERT INTO rental_assets (
  owner_id, asset_name, category_id, description, condition, daily_rate, security_deposit, pickup_location, city, status, requires_advance_booking
)
SELECT
  999,
  'Canon EOS R5 Camera Kit',
  c.id,
  'Professional mirrorless camera with 24-105 lens and spare batteries.',
  'Excellent',
  10000,
  30000,
  'Gulberg III',
  'Lahore',
  'available',
  false
FROM rental_asset_categories c
WHERE c.category_name = 'Photography'
  AND NOT EXISTS (SELECT 1 FROM rental_assets WHERE asset_name = 'Canon EOS R5 Camera Kit');

INSERT INTO asset_images (asset_id, image_url, is_primary, upload_order)
SELECT a.id, 'https://placehold.co/900x450?text=Canon+R5', true, 1
FROM rental_assets a
WHERE a.asset_name = 'Canon EOS R5 Camera Kit'
  AND NOT EXISTS (SELECT 1 FROM asset_images i WHERE i.asset_id = a.id);
