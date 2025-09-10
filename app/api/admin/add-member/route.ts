import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin"
;

export async function POST(req: Request) {
  try {
    const { orgId, email, role } = await req.json() as {
      orgId: string; email: string; role: "owner"|"admin"|"member";
    };
    if (!orgId || !email) return NextResponse.json({error:"Missing fields"},{status:400});

    // Hitta användaren i auth.users
    const { data: userList, error: uErr } = await supabaseAdmin.auth.admin.listUsers();
    if (uErr) return NextResponse.json({error:uErr.message},{status:400});
    const user = userList.users.find(u => (u.email ?? "").toLowerCase() === email.toLowerCase());
    if (!user) return NextResponse.json({error:"User not found in auth.users"},{status:404});

    const { data, error } = await supabaseAdmin
      .from("user_orgs")
      .insert({ user_id: user.id, org_id: orgId, role: role ?? "member" })
      .select()
      .single();

    if (error) return NextResponse.json({error:error.message},{status:400});
    return NextResponse.json({ ok:true, membership: data });
  } catch (e:any) {
    return NextResponse.json({ error: e.message ?? "server error" }, { status:500 });
  }
}
