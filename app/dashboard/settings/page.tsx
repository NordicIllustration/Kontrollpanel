"use client";

import React from "react";
import supabase from "@/lib/supabaseBrowser";

export default function SettingsPage() {
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password1, setPassword1] = React.useState("");
  const [password2, setPassword2] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getUser();
      if (s.user) {
        setEmail(s.user.email ?? "");
        const { data } = await supabase.from("profiles").select("full_name").eq("id", s.user.id).single();
        if (data?.full_name) setFullName(data.full_name);
      }
    })();
  }, []);

  const saveProfile = async () => {
    setMsg(null);
    const { data: s } = await supabase.auth.getUser();
    await supabase.from("profiles").upsert({ id: s.user?.id, full_name: fullName });
    setMsg("Sparat!");
  };

  const changePassword = async () => {
    if (!password1 || password1 !== password2) { setMsg("Lösenorden matchar inte"); return; }
    const { error } = await supabase.auth.updateUser({ password: password1 });
    setMsg(error ? error.message : "Lösenord uppdaterat");
    setPassword1(""); setPassword2("");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[var(--ink-900)]">Inställningar</h1>

      <section className="rounded-2xl bg-[var(--panel)] p-6 ring-1 ring-[color:var(--line)]">
        <h2 className="mb-3 font-semibold">Profil</h2>
        <div className="grid max-w-lg gap-3">
          <label className="text-sm">Namn</label>
          <input className="rounded-xl border border-[color:var(--line)] bg-[var(--panel)] px-3 py-2" value={fullName} onChange={e=>setFullName(e.target.value)} />
          <label className="mt-3 text-sm">E-post</label>
          <input disabled className="rounded-xl border border-[color:var(--line)] bg-[var(--ink-50)] px-3 py-2" value={email} />
          <button onClick={saveProfile} className="mt-4 w-fit rounded-xl bg-[var(--blue-700)] px-4 py-2 font-medium text-white hover:bg-[var(--blue-600)]">Spara</button>
        </div>
      </section>

      <section className="rounded-2xl bg-[var(--panel)] p-6 ring-1 ring-[color:var(--line)] max-w-lg">
        <h2 className="mb-3 font-semibold">Byt lösenord</h2>
        <div className="grid gap-3">
          <input type="password" placeholder="Nytt lösenord" className="rounded-xl border border-[color:var(--line)] bg-[var(--panel)] px-3 py-2" value={password1} onChange={e=>setPassword1(e.target.value)} />
          <input type="password" placeholder="Upprepa lösenord" className="rounded-xl border border-[color:var(--line)] bg-[var(--panel)] px-3 py-2" value={password2} onChange={e=>setPassword2(e.target.value)} />
          <button onClick={changePassword} className="w-fit rounded-xl border border-[color:var(--line)] px-4 py-2">Uppdatera</button>
        </div>
      </section>

      {msg && <div className="text-sm text-[var(--ink-700)]">{msg}</div>}
    </div>
  );
}
