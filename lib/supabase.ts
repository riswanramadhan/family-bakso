import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';

export const isSupabaseConfigured = Boolean(
	process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const noStoreFetch: typeof fetch = (input, init) => {
	return fetch(input, { ...(init ?? {}), cache: 'no-store' });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	global: {
		fetch: noStoreFetch,
	},
});
