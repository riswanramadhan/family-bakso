-- Reset orders data and restart order numbering from 1
CREATE OR REPLACE FUNCTION public.reset_orders_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.orders;

  PERFORM setval(
    pg_get_serial_sequence('public.orders', 'order_number'),
    1,
    false
  );
END;
$$;

-- Alias typo lama untuk kompatibilitas endpoint lama
CREATE OR REPLACE FUNCTION public.reset_ordrer()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.reset_orders_data();
$$;

-- Alias alternatif untuk kompatibilitas tambahan
CREATE OR REPLACE FUNCTION public.reset_order_data()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.reset_orders_data();
$$;

GRANT EXECUTE ON FUNCTION public.reset_orders_data() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_ordrer() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_order_data() TO anon, authenticated, service_role;

-- Pastikan PostgREST membaca function terbaru tanpa perlu tunggu cache refresh otomatis
NOTIFY pgrst, 'reload schema';
