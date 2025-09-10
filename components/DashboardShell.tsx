"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, Search, Bell, User, Settings as SettingsIcon, ChevronDown,
  LayoutGrid, Monitor, Layers, Database, PlayCircle, Activity, Sun, Moon, Shield
} from "lucide-react";
import { motion } from "framer-motion";

type MenuItem = { label: string; href: string; icon: any; };

function SidebarLink({ icon: Icon, label, href, active }:{
  icon: any; label: string; href: string; active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ring-1 ring-[color:var(--line)] ${
        active ? "bg-[var(--blue-50)] text-[var(--blue-800)]"
               : "text-[var(--ink-700)] hover:bg-[var(--blue-50)]"
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </Link>
  );
}

export default function DashboardShell({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();

  // Ljus/Mörk tema
  const [theme, setTheme] = React.useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const saved = localStorage.getItem("theme-pref");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  // Tenant-info (org)
  const [orgName, setOrgName] = React.useState<string | null>(null);
  const [role, setRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    const root = document.documentElement;

    // Tema ljus/mörk
    root.classList.add("theme-transition");
    root.dataset.theme = theme === "dark" ? "dark" : "light";
    localStorage.setItem("theme-pref", theme);
    const t = setTimeout(() => root.classList.remove("theme-transition"), 400);

    // Butiks-/org-tema (CSS-variabler) + namn + roll
    try {
      const rawTheme = localStorage.getItem("org-theme");
      if (rawTheme) {
        const vars = JSON.parse(rawTheme) as Record<string, string>;
        Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
      }
      const n = localStorage.getItem("org-name");
      if (n) setOrgName(n);
      const r = localStorage.getItem("org-role");
      if (r) setRole(r);
    } catch {}

    return () => clearTimeout(t);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === "light" ? "dark" : "light"));

  // Aktiv länk (stöd för undersidor)
  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Basmeny
  const baseMenu: MenuItem[] = [
    { label: "Översikt",   href: "/dashboard",          icon: LayoutGrid },
    { label: "Skärmar",    href: "/dashboard/screens",  icon: Monitor },
    { label: "Studio",     href: "/dashboard/studio",   icon: Layers },
    { label: "Bibliotek",  href: "/dashboard/library",  icon: Database },
    { label: "Publicera",  href: "/dashboard/publish",  icon: PlayCircle },
    { label: "Händelser",  href: "/dashboard/activity", icon: Activity },
    { label: "Inställningar", href: "/dashboard/settings", icon: SettingsIcon },
  ];

  // ➕ Admin-länk endast för owner/admin
  const effectiveMenu: MenuItem[] =
    role === "owner" || role === "admin"
      ? [...baseMenu, { label: "Admin", href: "/dashboard/admin", icon: Shield }]
      : baseMenu;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Standard-tokens (kan överskrivas av org-theme) */}
      <style>{`:
        :root{
          --blue-900:#0A2A43; --blue-800:#163E5F; --blue-700:#1F5D8A; --blue-600:#2B77AF; --blue-500:#3F92CE; --blue-400:#66AEE0; --blue-300:#93C6EC; --blue-200:#C1DFF7; --blue-100:#E8F3FE; --blue-50:#F5FAFF; --blue-25:#FAFCFF;
          --ink-900:#0B1320; --ink-800:#1C2533; --ink-700:#2D3B4F; --ink-600:#516177; --ink-500:#7B8BA1; --ink-400:#A7B3C3; --ink-300:#CFD7E2; --ink-200:#E7ECF3; --ink-100:#F4F6FA; --ink-50:#F9FBFD;
          --green-700:#166534; --green-50:#ECFDF5; --amber-700:#92400E; --amber-50:#FFFBEB; --red-700:#B91C1C; --red-50:#FEF2F2;
          --bg:#ffffff; --panel:#ffffff; --line: rgba(16,24,40,.08); --shadow: 0 1px 2px rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.06);
        }
        :root[data-theme='dark']{
          --blue-900:#CFE8FF; --blue-800:#B9DAFA; --blue-700:#9FC7EE; --blue-600:#7FB2DE; --blue-500:#5B9ACB; --blue-400:#3F82B4; --blue-300:#2E6B97; --blue-200:#25597C; --blue-100:#1E4A66; --blue-50:#163A50; --blue-25:#10293A;
          --ink-900:#F5F8FE; --ink-800:#DEE7F2; --ink-700:#C4D0E0; --ink-600:#A6B6C8; --ink-500:#8C9EB3; --ink-400:#6F859C; --ink-300:#566C84; --ink-200:#40566C; --ink-100:#2C4156; --ink-50:#1C2B3B;
          --green-700:#34D399; --green-50:#062B22; --amber-700:#F59E0B; --amber-50:#2A1F04; --red-700:#F87171; --red-50:#2B0C0C;
          --bg:#0A1723; --panel:#0F2233; --line: rgba(255,255,255,.08); --shadow: 0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.5);
        }
        .theme-transition *{
          transition: background-color .35s ease, color .35s ease, border-color .35s ease, fill .35s ease, stroke .35s ease;
        }
      `}</style>

      {/* TOPBAR */}
      <div className="sticky top-0 z-40 border-b border-[color:var(--line)] bg-[var(--panel)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <button className="rounded-xl p-2 hover:bg-[var(--blue-50)]" aria-label="Öppna meny">
              <Menu className="h-5 w-5 text-[var(--ink-700)]" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-[var(--blue-700)]" />
              <span className="font-semibold text-[var(--blue-800)]">
                {orgName ?? "Panel"}
              </span>
            </Link>
          </div>

          <div className="relative hidden w-full max-w-md items-center md:flex">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--ink-400)]" />
            <input
              className="w-full rounded-xl border border-[color:var(--line)] bg-[var(--ink-50)] py-2 pl-10 pr-4 text-sm placeholder:text-[var(--ink-400)] focus:bg-[var(--panel)]"
              placeholder="Sök i kanaler, skärmar, mallar…"
            />
          </div>

          <div className="flex items-center gap-1">
            <button className="rounded-xl p-2 hover:bg-[var(--blue-50)]" aria-label="Tema" onClick={toggleTheme}>
              <motion.span
                key={theme}
                initial={{ rotate: theme === "dark" ? -180 : 180, scale: 0.8, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="block"
              >
                {theme === "dark" ? <Sun className="h-5 w-5 text-[var(--ink-700)]" /> : <Moon className="h-5 w-5 text-[var(--ink-700)]" />}
              </motion.span>
            </button>

            <button className="rounded-xl p-2 hover:bg-[var(--blue-50)]" aria-label="Aviseringar">
              <Bell className="h-5 w-5 text-[var(--ink-700)]" />
            </button>

            <Link href="/dashboard/settings" className="rounded-xl p-2 hover:bg-[var(--blue-50)]" aria-label="Inställningar">
              <SettingsIcon className="h-5 w-5 text-[var(--ink-700)]" />
            </Link>

            <button className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-sm hover:bg-[var(--blue-50)]">
              <User className="h-4 w-4" /><span>Du</span><ChevronDown className="h-4 w-4" />
            </button>

            <button
              className="ml-2 rounded-xl border border-[color:var(--line)] px-3 py-1.5 text-sm hover:bg-[var(--blue-50)]"
              onClick={async () => {
                const { default: supabase } = await import("@/lib/supabaseBrowser");
                const { error } = await supabase.auth.signOut();
                // rensa ev. tenant-data
                try {
                  localStorage.removeItem("org-theme");
                  localStorage.removeItem("org-name");
                  localStorage.removeItem("org-slug");
                  localStorage.removeItem("org-role");
                } catch {}
                if (!error) location.href = "/login";
              }}
            >
              Logga ut
            </button>
          </div>
        </div>
      </div>

      {/* LAYOUT */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[240px_1fr]">
        {/* SIDOMENY */}
        <aside className="hidden lg:block">
          <nav className="sticky top-16 space-y-1">
            {effectiveMenu.map((m) => (
              <SidebarLink key={m.href} icon={m.icon} label={m.label} href={m.href} active={isActive(m.href)} />
            ))}
          </nav>
        </aside>

        {/* INNEHÅLL */}
        <main className="space-y-4">
          {children ?? (
            <div className="rounded-2xl bg-[var(--panel)] p-6 ring-1 ring-[color:var(--line)] text-[var(--ink-700)]">
              Välj något i menyn till vänster, t.ex. <Link href="/dashboard/publish" className="text-[var(--blue-700)] underline">Publicera</Link>.
            </div>
          )}
        </main>
      </div>

      {/* FOOTER */}
      <footer className="mt-8 border-t border-[color:var(--line)] bg-[var(--panel)]/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 text-sm text-[var(--ink-600)]">
          <div>© 2025 Ditt Brand</div>
          <div className="flex items-center gap-3">
            <a className="text-[var(--blue-700)] hover:underline" href="#">Hjälp</a>
            <a className="text-[var(--blue-700)] hover:underline" href="#">Integritet</a>
            <a className="text-[var(--blue-700)] hover:underline" href="/dashboard/settings">Inställningar</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

