import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST() {
  const { error } = await supabaseServer.rpc('reset_orders_data');

  if (error) {
    return NextResponse.json(
      {
        error: 'Reset data gagal. Pastikan fungsi reset_orders_data tersedia di database.',
        detail: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
