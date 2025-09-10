import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Kasta tydligt fel om nycklarna inte finns
if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing (.env.local)");
if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing (.env.local)");

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
