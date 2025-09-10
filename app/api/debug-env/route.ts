export async function GET() {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasBase = !!process.env.NEXT_PUBLIC_BASE_URL;
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? '';

  return new Response(
    JSON.stringify({
      NEXT_PUBLIC_SUPABASE_URL: hasUrl,
      SUPABASE_SERVICE_ROLE_KEY: hasRole,
      NEXT_PUBLIC_BASE_URL: hasBase,
      NEXT_PUBLIC_SUPABASE_BUCKET: bucket // ska vara "media" exakt
    }),
    { headers: { "content-type": "application/json" } }
  );
}
