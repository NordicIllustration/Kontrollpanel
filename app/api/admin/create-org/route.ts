import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { slug, name, logoUrl, cssVars } = await req.json() as {
      slug: string; name: string; logoUrl?: string; cssVars?: Record<string,string>;
    };
    if (!slug || !name) return NextResponse.json({error:"Missing slug/name"},{status:400});

    // Skapa (eller ignorera om finns); vi uppdaterar INTE namn om den redan finns
    const { data, error } = await supabaseAdmin
      .from("orgs")
      .insert({ slug, name, logo_url: logoUrl ?? null, theme: { cssVars: cssVars ?? {} } })
      .select()
      .single();

    if (error) return NextResponse.json({error:error.message},{status:400});
    return NextResponse.json({ ok:true, org: data });
  } catch (e:any) {
    return NextResponse.json({ error: e.message ?? "server error" }, { status:500 });
  }
}
