-- Simulated E-Commerce Backend Database Schema & Seed Data (ecommerce DB)

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total NUMERIC(10, 2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL
);

-- Seed Data

INSERT INTO users (id, email, name) VALUES
('usr_101', 'alex.dev@example.com', 'Alex Dev'),
('usr_102', 'sarah.engineer@example.com', 'Sarah Engineer'),
('usr_103', 'john.backend@example.com', 'John Backend')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, title, price, stock) VALUES
('prd_001', 'Developer Ergonomic Mechanical Keyboard', 149.99, 50),
('prd_002', '4K UltraWide Monitor 34-inch', 699.99, 20),
('prd_003', 'Wireless Noise Canceling Headphones', 199.50, 40),
('prd_004', 'USB-C Dual 4K Docking Station', 129.00, 30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO orders (id, user_id, total, status) VALUES
('ord_5001', 'usr_101', 349.49, 'COMPLETED'),
('ord_5002', 'usr_102', 699.99, 'PROCESSING')
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES
('item_901', 'ord_5001', 'prd_001', 1, 149.99),
('item_902', 'ord_5001', 'prd_003', 1, 199.50),
('item_903', 'ord_5002', 'prd_002', 1, 699.99)
ON CONFLICT (id) DO NOTHING;
