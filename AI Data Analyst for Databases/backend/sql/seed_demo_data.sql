-- Demo analytics dataset for local testing (Chat / execute).
-- Safe to re-run: drops and recreates the demo schema.
-- Apply: psql "$MIGRATION_DATABASE_URL" -f backend/sql/seed_demo_data.sql
-- Docker: docker exec -i infra-postgres-1 psql -U datawhisper -d datawhisper -f - < backend/sql/seed_demo_data.sql

DROP SCHEMA IF EXISTS demo CASCADE;
CREATE SCHEMA demo;

CREATE TABLE demo.regions (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  country     TEXT NOT NULL
);

CREATE TABLE demo.customers (
  id           SERIAL PRIMARY KEY,
  full_name    TEXT NOT NULL,
  email        TEXT NOT NULL UNIQUE,
  region_id    INT NOT NULL REFERENCES demo.regions (id),
  signup_date  DATE NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE demo.products (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  unit_price  NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0)
);

CREATE TABLE demo.orders (
  id            SERIAL PRIMARY KEY,
  customer_id   INT NOT NULL REFERENCES demo.customers (id),
  order_date    DATE NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('pending', 'shipped', 'delivered', 'cancelled')),
  total_amount  NUMERIC(12, 2) NOT NULL DEFAULT 0
);

CREATE TABLE demo.order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INT NOT NULL REFERENCES demo.orders (id) ON DELETE CASCADE,
  product_id  INT NOT NULL REFERENCES demo.products (id),
  quantity    INT NOT NULL CHECK (quantity > 0),
  line_total  NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0),
  UNIQUE (order_id, product_id)
);

INSERT INTO demo.regions (name, country) VALUES
  ('North', 'USA'),
  ('South', 'USA'),
  ('West', 'USA'),
  ('East', 'USA'),
  ('EU Central', 'Germany'),
  ('EU West', 'France'),
  ('APAC', 'India');

INSERT INTO demo.customers (full_name, email, region_id, signup_date, is_active) VALUES
  ('Alice Johnson', 'alice@example.com', 1, '2024-01-15', true),
  ('Bob Smith', 'bob@example.com', 2, '2024-02-20', true),
  ('Carol Davis', 'carol@example.com', 3, '2024-03-10', true),
  ('David Lee', 'david@example.com', 4, '2024-01-28', false),
  ('Eva Martinez', 'eva@example.com', 5, '2024-04-05', true),
  ('Frank Wilson', 'frank@example.com', 6, '2024-05-12', true),
  ('Grace Kim', 'grace@example.com', 7, '2024-06-18', true),
  ('Henry Brown', 'henry@example.com', 1, '2024-07-22', true),
  ('Ivy Taylor', 'ivy@example.com', 2, '2024-08-30', true),
  ('Jack Anderson', 'jack@example.com', 3, '2024-09-14', true),
  ('Karen White', 'karen@example.com', 4, '2024-10-01', true),
  ('Leo Garcia', 'leo@example.com', 5, '2024-11-19', false),
  ('Mia Rodriguez', 'mia@example.com', 6, '2024-12-03', true),
  ('Noah Clark', 'noah@example.com', 7, '2025-01-08', true),
  ('Olivia Hall', 'olivia@example.com', 1, '2025-02-14', true);

INSERT INTO demo.products (name, category, unit_price) VALUES
  ('Laptop Pro 14', 'Electronics', 1299.00),
  ('Wireless Mouse', 'Electronics', 29.99),
  ('USB-C Hub', 'Electronics', 49.50),
  ('Standing Desk', 'Furniture', 599.00),
  ('Ergonomic Chair', 'Furniture', 449.00),
  ('Notebook Pack', 'Office', 12.99),
  ('Premium Pen Set', 'Office', 24.50),
  ('Monitor 27"', 'Electronics', 379.00),
  ('Webcam HD', 'Electronics', 89.00),
  ('Desk Lamp LED', 'Office', 34.99),
  ('Bookshelf Oak', 'Furniture', 199.00),
  ('Coffee Maker', 'Appliances', 79.99);

INSERT INTO demo.orders (customer_id, order_date, status, total_amount) VALUES
  (1, '2025-01-10', 'delivered', 1328.99),
  (2, '2025-01-12', 'delivered', 449.00),
  (3, '2025-01-15', 'shipped', 428.49),
  (5, '2025-01-18', 'delivered', 1299.00),
  (7, '2025-01-20', 'pending', 62.48),
  (8, '2025-02-01', 'delivered', 978.00),
  (9, '2025-02-05', 'shipped', 89.00),
  (10, '2025-02-08', 'delivered', 199.00),
  (11, '2025-02-10', 'cancelled', 0),
  (13, '2025-02-12', 'delivered', 454.49),
  (14, '2025-02-15', 'delivered', 79.99),
  (15, '2025-02-18', 'shipped', 1413.99),
  (1, '2025-03-01', 'delivered', 49.50),
  (3, '2025-03-05', 'pending', 599.00),
  (6, '2025-03-08', 'delivered', 24.50);

INSERT INTO demo.order_items (order_id, product_id, quantity, line_total) VALUES
  (1, 1, 1, 1299.00), (1, 2, 1, 29.99),
  (2, 5, 1, 449.00),
  (3, 8, 1, 379.00), (3, 3, 1, 49.50),
  (4, 1, 1, 1299.00),
  (5, 6, 2, 25.98), (5, 7, 1, 24.50), (5, 10, 1, 34.99),
  (6, 4, 1, 599.00), (6, 9, 1, 89.00), (6, 10, 1, 34.99), (6, 3, 1, 49.50), (6, 2, 1, 29.99), (6, 6, 1, 12.99), (6, 7, 1, 24.50), (6, 11, 1, 199.00),
  (7, 9, 1, 89.00),
  (8, 11, 1, 199.00),
  (10, 5, 1, 449.00), (10, 3, 1, 49.50),
  (11, 12, 1, 79.99),
  (12, 1, 1, 1299.00), (12, 4, 1, 599.00),
  (13, 3, 1, 49.50),
  (14, 4, 1, 599.00),
  (15, 7, 1, 24.50);

-- Recalculate order totals from line items (keeps data consistent)
UPDATE demo.orders o
SET total_amount = sub.sum_total
FROM (
  SELECT order_id, ROUND(SUM(line_total)::numeric, 2) AS sum_total
  FROM demo.order_items
  GROUP BY order_id
) sub
WHERE o.id = sub.order_id;

CREATE INDEX idx_demo_customers_region ON demo.customers (region_id);
CREATE INDEX idx_demo_orders_customer ON demo.orders (customer_id);
CREATE INDEX idx_demo_orders_date ON demo.orders (order_date);
CREATE INDEX idx_demo_order_items_order ON demo.order_items (order_id);

GRANT USAGE ON SCHEMA demo TO datawhisper_app;
GRANT SELECT ON ALL TABLES IN SCHEMA demo TO datawhisper_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA demo TO datawhisper_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA demo GRANT SELECT ON TABLES TO datawhisper_app;

GRANT USAGE ON SCHEMA demo TO datawhisper;
GRANT SELECT ON ALL TABLES IN SCHEMA demo TO datawhisper;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA demo TO datawhisper;
