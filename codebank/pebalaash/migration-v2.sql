-- Pebalaash v2 migration: multi-currency wallets, country products, ratings

-- Wallets: add silver & gold columns
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS silver BIGINT NOT NULL DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS gold   BIGINT NOT NULL DEFAULT 0;

-- Products: add country, multi-price, ratings columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_silver  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_gold    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS country_code  TEXT    NOT NULL DEFAULT 'ALL';
ALTER TABLE products ADD COLUMN IF NOT EXISTS avg_rating    DOUBLE PRECISION DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating_count  INTEGER NOT NULL DEFAULT 0;

-- Back-fill price_silver / price_gold from existing price_codes
UPDATE products SET price_silver = GREATEST(1, CEIL(price_codes::numeric / 100)) WHERE price_silver = 0;
UPDATE products SET price_gold   = GREATEST(1, CEIL(price_codes::numeric / 10000)) WHERE price_gold = 0;

-- Orders: add payment_type / amount_paid
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_type TEXT    NOT NULL DEFAULT 'codes';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount_paid  INTEGER NOT NULL DEFAULT 0;

-- Backfill amount_paid from total_codes
UPDATE orders SET amount_paid = total_codes WHERE amount_paid = 0;

-- Ratings table
CREATE TABLE IF NOT EXISTS pebalaash_ratings (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id    UUID    NOT NULL,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review     TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);
