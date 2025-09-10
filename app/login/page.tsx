"use client";

import React from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = React.useState(""); // username eller e-post
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace("/dashboard");
    })();
  }, [router]);

  const resolveEmail = async (input: string) => {
    if (input.includes("@")) return input.trim();
    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("username", input.trim())
      .limit(1)
      .maybeSingle();
    if (error || !data?.email) throw new Error("Fel användarnamn");
    return data.email as string;
  };

  const afterLoginRouteAndTheme = async () => {
    // Hämta användare
    const { data: s } = await supabase.auth.getUser();
    const user = s.user;
    if (!user) return;

    // Hämta butik(er)
    const { data: memberships } = await supabase
      .from("user_orgs")
      .select("role, orgs:org_id (slug,name,theme)")
      .eq("user_id", user.id);

    // fallback om ingen org hittas (tillåter ändå login)
    const first = (memberships ?? [])[0] as any;

    const org = first?.orgs ?? null;
    const role = first?.role ?? "member";

    // Spara i localStorage (läser vi i DashboardShell)
    try {
      if (org?.name) localStorage.setItem("org-name", org.name);
      if (org?.slug) localStorage.setItem("org-slug", org.slug);
      if (org?.theme?.cssVars)
        localStorage.setItem("org-theme", JSON.stringify(org.theme.cssVars));
      localStorage.setItem("org-role", role);
    } catch {}

    // Skicka användaren till kontrollpanelen
    router.replace("/dashboard");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const email = await resolveEmail(identifier);
      const { error: signinErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signinErr) throw signinErr;

      await afterLoginRouteAndTheme();
    } catch (e: any) {
      setError(e?.message ?? "Fel vid inloggning");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen w-screen place-items-center bg-[var(--bg)] px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl bg-[var(--panel)] p-6 ring-1 ring-[color:var(--line)]"
      >
        <h1 className="mb-4 text-xl font-semibold text-[var(--ink-900)]">
          Logga in
        </h1>

        <div className="space-y-3">
          <input
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Användarnamn eller e-post"
            className="w-full rounded-xl border border-[color:var(--line)] bg-[var(--panel)] px-3 py-2"
            autoComplete="username"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Lösenord"
            className="w-full rounded-xl border border-[color:var(--line)] bg-[var(--panel)] px-3 py-2"
            autoComplete="current-password"
          />
          {error && <div className="text-sm text-[var(--red-700)]">{error}</div>}
          <button
            disabled={loading}
            className="w-full rounded-xl bg-[var(--blue-700)] px-4 py-2 font-medium text-white hover:bg-[var(--blue-600)] disabled:opacity-50"
          >
            {loading ? "Loggar in…" : "Logga in"}
          </button>
        </div>

        <p className="mt-4 text-xs text-[var(--ink-500)]">
          Konton skapas av administratör.
        </p>
      </form>
    </div>
  );
}
