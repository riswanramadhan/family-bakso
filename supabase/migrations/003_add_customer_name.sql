-- Add customer name field for existing deployments
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS customer_name TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_customer_name
ON public.orders(customer_name);

-- Ask PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
