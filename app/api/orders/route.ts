import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const { data, error } = await supabaseServer
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { data, error } = await supabaseServer.from('orders').insert(body).select('*').single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, status, payment_method, cash_received, change_amount, customer_name } = body as {
    id?: string;
    status?: string;
    payment_method?: 'tunai' | 'qris';
    cash_received?: number | null;
    change_amount?: number | null;
    customer_name?: string | null;
  };

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  if (payment_method && payment_method !== 'tunai' && payment_method !== 'qris') {
    return NextResponse.json({ error: 'payment_method must be tunai or qris' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (status) {
    updates.status = status;
  }

  if (payment_method) {
    updates.payment_method = payment_method;
  }

  if ('cash_received' in body) {
    updates.cash_received = cash_received ?? null;
  }

  if ('change_amount' in body) {
    updates.change_amount = change_amount ?? null;
  }

  if ('customer_name' in body) {
    updates.customer_name = customer_name ?? null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
