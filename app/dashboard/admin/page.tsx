"use client";

import React from "react";
import supabase from "@/lib/supabaseBrowser";
import { Plus, Save, Users, Shield, Image as ImageIcon, Upload } from "lucide-react";

type Org = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  theme: { cssVars?: Record<string, string> } | null;
};

export default function AdminPage() {
  const [authorized, setAuthorized] = React.useState<boolean | null>(null);
  const [orgs, setOrgs] = React.useState<Org[]>([]);
  const [selectedOrgId, setSelectedOrgId] = React.useState<string | null>(null);

  // CREATE form (påverkar INTE "hantera butik")
  const [slug, setSlug] = React.useState("");
  const [name, setName] = React.useState("");
  const [createLogoFile, setCreateLogoFile] = React.useState<File | null>(null);
  const [createLogoPreview, setCreateLogoPreview] = React.useState<string | null>(null);
  const [createCssVars, setCreateCssVars] = React.useState<Record<string, string>>({
    "--blue-700": "#E30613", "--blue-800": "#98000C", "--blue-50": "#FFF6F6",
  });

  // EDIT (hantera vald butik)
  const [editLogoFile, setEditLogoFile] = React.useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = React.useState<string | null>(null);
  const [editCssVars, setEditCssVars] = React.useState<Record<string, string>>({
    "--blue-700": "#E30613", "--blue-800": "#98000C", "--blue-50": "#FFF6F6",
  });

  // Add member
  const [memberEmail, setMemberEmail] = React.useState("");
  const [memberRole, setMemberRole] = React.useState<"owner"|"admin"|"member">("member");

  React.useEffect(() => {
    (async () => {
      // auth + roll
      const { data: s } = await supabase.auth.getUser();
      const uid = s.user?.id;
      if (!uid) { setAuthorized(false); return; }

      const { data: memberships } = await supabase
        .from("user_orgs").select("role").eq("user_id", uid);
      const roles = (memberships ?? []).map(r => r.role);
      const isAdmin = roles.some(r => r === "owner" || r === "admin");

      setAuthorized(isAdmin);

      const { data: allOrgs } = await supabase.from("orgs").select("*").order("created_at",{ascending:false});
      const list = (allOrgs as Org[]) ?? [];
      setOrgs(list);
      if (list.length) {
        setSelectedOrgId(list[0].id);
        // init editCss från vald org
        const css = list[0].theme?.cssVars ?? undefined;
        if (css) setEditCssVars(css);
      }
    })();
  }, []);

  React.useEffect(()=> {
    // när man byter vald org: ladda dess css + nulogo-preview
    const org = orgs.find(o => o.id === selectedOrgId);
    if (!org) return;
    const css = org.theme?.cssVars ?? undefined;
    if (css) setEditCssVars(css);
    setEditLogoPreview(org.logo_url ?? null);
    setEditLogoFile(null);
  }, [selectedOrgId, orgs]);

  if (authorized === null) return <div className="rounded-2xl bg-[var(--panel)] p-6 ring-1 ring-[color:var(--line)]">Kontrollerar behörighet…</div>;
  if (!authorized) return <div className="rounded-2xl bg-[var(--panel)] p-6 ring-1 ring-[color:var(--line)]">Du har inte behörighet att se denna sida.</div>;

  // ===== helpers =====
  const uploadToBucket = async (file: File): Promise<string | null> => {
    const path = `org-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("org-logos").upload(path, file, { upsert: true });
    if (error) { alert("Kunde inte ladda upp logo: " + error.message); return null; }
    const { data } = supabase.storage.from("org-logos").getPublicUrl(path);
    return data.publicUrl;
  };

  // CREATE
  const createOrg = async () => {
    if (!slug || !name) { alert("Fyll i slug & namn"); return; }
    let logoUrl: string | null = null;
    if (createLogoFile) {
      const u = await uploadToBucket(createLogoFile);
      if (u) logoUrl = u;
    }
    const res = await fetch("/api/admin/create-org", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name, logoUrl, cssVars: createCssVars }),
    });
    const json = await res.json();
    if (!res.ok) { alert(json.error || "Fel vid skapande"); return; }

    alert("Butik skapad!");
    setSlug(""); setName("");
    setCreateLogoFile(null); setCreateLogoPreview(null);

    const { data: allOrgs } = await supabase.from("orgs").select("*").order("created_at",{ascending:false});
    setOrgs((allOrgs as Org[]) ?? []);
  };

  // EDIT
  const saveThemeAndLogo = async () => {
    if (!selectedOrgId) { alert("Välj butik"); return; }
    let logoUrl = editLogoPreview ?? null;
    if (editLogoFile) {
      const u = await uploadToBucket(editLogoFile);
      if (u) logoUrl = u;
    }
    const res = await fetch("/api/admin/update-org", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: selectedOrgId, logoUrl, cssVars: editCssVars }),
    });
    const json = await res.json();
    if (!res.ok) { alert(json.error || "Fel vid uppdatering"); return; }
    alert("Tema/logo uppdaterat!");

    // refresh
    const { data: allOrgs } = await supabase.from("orgs").select("*").order("created_at",{ascending:false});
    const list = (allOrgs as Org[]) ?? [];
    setOrgs(list);
  };

  // Members
  const addMember = async () => {
    if (!selectedOrgId) { alert("Välj butik"); return; }
    if (!memberEmail) { alert("Skriv e-post"); return; }
    const res = await fetch("/api/admin/add-member", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: selectedOrgId, email: memberEmail, role: memberRole }),
    });
    const json = await res.json();
    if (!res.ok) { alert(json.error || "Fel vid tilldelning"); return; }
    alert("Användare tillagd!");
    setMemberEmail("");
  };

  // UI helpers
  const setVarCreate = (k:string,v:string)=> setCreateCssVars(p=>({ ...p,[k]:v }));
  const setVarEdit   = (k:string,v:string)=> setEditCssVars(p=>({ ...p,[k]:v }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[var(--ink-900)]">Admin – Butiker</h1>

      {/* Skapa ny butik */}
      <section className="rounded-2xl bg-[var(--panel)] p-6 ring-1 ring-[color:var(--line)]">
        <div className="mb-4 flex items-center gap-2"><Plus className="h-5 w-5"/><h2 className="text-lg font-semibold">Skapa ny butik</h2></div>

        <div className="grid max-w-2xl gap-3">
          <label className="text-sm">Slug (kan inte ändras)</label>
          <input value={slug} onChange={e=>setSlug(e.target.value.replace(/\s+/g,"-").toLowerCase())}
                 placeholder="t.ex. ica-arsta" className="rounded-xl border border-[color:var(--line)] bg-[var(--panel)] px-3 py-2"/>

          <label className="text-sm mt-2">Butiksnamn (låses efter skapande)</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="ICA Supermarket Årsta"
                 className="rounded-xl border border-[color:var(--line)] bg-[var(--panel)] px-3 py-2"/>

          <label className="text-sm mt-2">Logo (valfritt)</label>
          <div className="flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[color:var(--line)] bg-[var(--panel)] px-3 py-2 text-sm hover:bg-[var(--blue-50)]">
              <Upload className="h-4 w-4" /> Välj fil
              <input type="file" accept="image/*" className="hidden"
                     onChange={(e)=>{ const f=e.target.files?.[0]||null; setCreateLogoFile(f); setCreateLogoPreview(f?URL.createObjectURL(f):null); }}/>
            </label>
            {createLogoPreview ? <img src={createLogoPreview} className="h-10 rounded-md ring-1 ring-[color:var(--line)]"/> : <div className="text-sm text-[var(--ink-600)]">Ingen vald</div>}
          </div>

          {/* Enkla färgnycklar */}
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {Object.entries(createCssVars).map(([k,v])=>(
              <div key={k} className="flex items-center gap-2">
                <input disabled value={k} className="w-40 rounded-xl border border-[color:var(--line)] bg-[var(--ink-50)] px-3 py-2 text-sm"/>
                <input value={v} onChange={e=>setVarCreate(k,e.target.value)}
                       className="flex-1 rounded-xl border border-[color:var(--line)] bg-[var(--panel)] px-3 py-2 text-sm" />
                <div className="h-6 w-6 rounded-md ring-1 ring-[color:var(--line)]" style={{background:v}}/>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={createOrg} className="inline-flex items-center gap-2 rounded-xl bg-[var(--blue-700)] px-4 py-2 text-white hover:bg-[var(--blue-600)]">
              <Save className="h-4 w-4"/> Skapa butik
            </button>
          </div>
        </div>
      </section>

      {/* Hantera butik */}
      <section className="rounded-2xl bg-[var(--panel)] p-6 ring-1 ring-[color:var(--line)]">
        <div className="mb-4 flex items-center gap-2"><Shield className="h-5 w-5"/><h2 className="text-lg font-semibold">Hantera butik</h2></div>

        <div className="grid max-w-3xl gap-3">
          <label className="text-sm">Välj butik</label>
          <select value={selectedOrgId ?? ""} onChange={e=>setSelectedOrgId(e.target.value)}
                  className="w-full rounded-xl border border-[color:var(--line)] bg-[var(--panel)] px-3 py-2">
            {orgs.map(o => <option key={o.id} value={o.id}>{o.name} ({o.slug})</option>)}
          </select>

          <div className="mt-4 grid gap-2 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm">Namn (låst)</div>
              <input disabled value={orgs.find(o=>o.id===selectedOrgId)?.name ?? ""} className="w-full rounded-xl border border-[color:var(--line)] bg-[var(--ink-50)] px-3 py-2"/>
            </div>

            <div>
              <div className="mb-2 text-sm">Logotyp</div>
              <div className="flex items-center gap-3">
                {editLogoPreview ? <img src={editLogoPreview} className="h-10 rounded-md ring-1 ring-[color:var(--line)]"/> : <div className="text-sm text-[var(--ink-600)]">Ingen uppladdad</div>}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[color:var(--line)] bg-[var(--panel)] px-3 py-2 text-sm hover:bg-[var(--blue-50)]">
                  <ImageIcon className="h-4 w-4" /> Byt logo
                  <input type="file" accept="image/*" className="hidden"
                         onChange={(e)=>{ const f=e.target.files?.[0]||null; setEditLogoFile(f); setEditLogoPreview(f?URL.createObjectURL(f):editLogoPreview); }}/>
                </label>
              </div>
            </div>
          </div>

          {/* Tema (redigering) */}
          <div className="mt-4">
            <div className="mb-2 text-sm">Tema (CSS-variabler)</div>
            <div className="grid gap-2 md:grid-cols-3">
              {Object.entries(editCssVars).map(([k,v])=>(
                <div key={k} className="flex items-center gap-2">
                  <input disabled value={k} className="w-40 rounded-xl border border-[color:var(--line)] bg-[var(--ink-50)] px-3 py-2 text-sm"/>
                  <input value={v} onChange={e=>setVarEdit(k,e.target.value)}
                         className="flex-1 rounded-xl border border-[color:var(--line)] bg-[var(--panel)] px-3 py-2 text-sm"/>
                  <div className="h-6 w-6 rounded-md ring-1 ring-[color:var(--line)]" style={{background:v}}/>
                </div>
              ))}
            </div>
            <button onClick={()=>setEditCssVars(prev=>({ ...prev, "--blue-700":"#E30613", "--blue-800":"#98000C", "--blue-50":"#FFF6F6" }))}
                    className="mt-3 rounded-xl border border-[color:var(--line)] px-3 py-1.5 text-sm hover:bg-[var(--blue-50)]">
              ICA-röd preset
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={saveThemeAndLogo}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--blue-700)] px-4 py-2 text-white hover:bg-[var(--blue-600)]">
              <Save className="h-4 w-4"/> Spara tema/logo
            </button>
          </div>
        </div>
      </section>

      {/* Medlemmar */}
      <section className="rounded-2xl bg-[var(--panel)] p-6 ring-1 ring-[color:var(--line)]">
        <div className="mb-4 flex items-center gap-2"><Users className="h-5 w-5"/><h2 className="text-lg font-semibold">Lägg till medlem</h2></div>
        <div className="grid max-w-2xl gap-3">
          <label className="text-sm">E-post</label>
          <input value={memberEmail} onChange={e=>setMemberEmail(e.target.value)}
                 placeholder="user@exempel.se" className="rounded-xl border border-[color:var(--line)] bg-[var(--panel)] px-3 py-2"/>
          <label className="text-sm mt-2">Roll</label>
          <select value={memberRole} onChange={e=>setMemberRole(e.target.value as any)}
                  className="rounded-xl border border-[color:var(--line)] bg-[var(--panel)] px-3 py-2">
            <option value="member">member</option>
            <option value="admin">admin</option>
            <option value="owner">owner</option>
          </select>
          <div className="mt-3">
            <button onClick={addMember} className="rounded-xl border border-[color:var(--line)] px-4 py-2 hover:bg-[var(--blue-50)]">
              Lägg till
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
