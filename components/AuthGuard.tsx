"use client";
import React from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseBrowser";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setOk(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace("/login");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  if (!ok) return (
    <div className="grid h-screen w-screen place-items-center bg-[var(--bg)] text-[var(--ink-900)]">
      Loggar in…
    </div>
  );

  return <>{children}</>;
}
