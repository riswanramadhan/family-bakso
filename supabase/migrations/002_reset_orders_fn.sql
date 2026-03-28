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

GRANT EXECUTE ON FUNCTION public.reset_orders_data() TO anon, authenticated, service_role;
