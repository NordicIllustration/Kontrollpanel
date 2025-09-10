// lib/supabaseAdmin.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing (.env.local / Vercel env).");
}
if (!serviceKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing (.env.local / Vercel env).");
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// ✔ default export (så att `import supabaseAdmin from ...` fungerar)
export default supabaseAdmin;
