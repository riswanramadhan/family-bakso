-- ============================================
-- FAMILY BAKSO POS - Database Schema
-- ============================================
-- Jalankan SQL ini di Supabase Dashboard:
-- 1. Buka https://supabase.com/dashboard
-- 2. Pilih project Anda
-- 3. Klik "SQL Editor" di sidebar
-- 4. Paste seluruh isi file ini
-- 5. Klik "Run"
-- ============================================

-- Drop existing table if exists (untuk fresh start)
DROP TABLE IF EXISTS orders CASCADE;

-- Orders table
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number SERIAL,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'tunai' CHECK (payment_method IN ('tunai', 'qris')),
  cash_received INTEGER,
  change_amount INTEGER,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'done', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_customer_name ON orders(customer_name);

-- ============================================
-- ROW LEVEL SECURITY (RLS) - PENTING!
-- ============================================
-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy untuk SELECT (baca semua data)
CREATE POLICY "Allow public read access"
ON orders FOR SELECT
TO anon, authenticated
USING (true);

-- Policy untuk INSERT (tambah data baru)
CREATE POLICY "Allow public insert access"
ON orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy untuk UPDATE (update data)
CREATE POLICY "Allow public update access"
ON orders FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Policy untuk DELETE (hapus data) - optional
CREATE POLICY "Allow public delete access"
ON orders FOR DELETE
TO anon, authenticated
USING (true);

-- ============================================
-- REALTIME (untuk fitur dapur live update)
-- ============================================
-- Cek apakah publication exists, jika tidak buat baru
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

-- Add orders table to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- ============================================
-- TRIGGER untuk auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists dan buat ulang
DROP TRIGGER IF EXISTS orders_updated_at ON orders;

CREATE TRIGGER orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- TEST: Insert sample data untuk memastikan berfungsi
-- ============================================
-- INSERT INTO orders (items, subtotal, total, payment_method, status)
-- VALUES (
--   '[{"menu_id": "test", "name": "Test Item", "quantity": 1, "unit_price": 10000, "subtotal": 10000, "notes": "", "add_ons": []}]',
--   10000,
--   10000,
--   'tunai',
--   'pending'
-- );

-- Uncomment baris di atas untuk test, lalu hapus data test dengan:
-- DELETE FROM orders WHERE items::text LIKE '%Test Item%';

-- ============================================
-- SELESAI!
-- ============================================
-- Setelah menjalankan SQL ini, refresh halaman POS dan coba buat order baru.
