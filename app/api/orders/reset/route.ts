import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST() {
  const candidates = ['reset_orders_data', 'reset_ordrer', 'reset_order_data'];
  const diagnostics: string[] = [];

  for (const fnName of candidates) {
    const { error } = await supabaseServer.rpc(fnName);
    if (!error) {
      return NextResponse.json({ ok: true, functionUsed: fnName });
    }
    diagnostics.push(`${fnName}: ${error.message}`);
  }

  // Fallback: still clear order rows so operator can continue, even if sequence reset function is missing.
  const { error: deleteError } = await supabaseServer.from('orders').delete().not('id', 'is', null);

  if (!deleteError) {
    return NextResponse.json({
      ok: true,
      warning:
        'Semua order berhasil dihapus, tetapi sequence order_number belum direset. Jalankan fungsi reset_orders_data agar nomor kembali ke #001.',
      detail: diagnostics.join(' | '),
    });
  }

  return NextResponse.json(
    {
      error: 'Reset data gagal. Fungsi reset tidak ditemukan atau tidak bisa dijalankan.',
      detail: [...diagnostics, `delete fallback: ${deleteError.message}`].join(' | '),
    },
    { status: 500 }
  );
}
