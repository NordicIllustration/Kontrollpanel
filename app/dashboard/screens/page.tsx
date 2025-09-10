// app/dashboard/screens/page.tsx
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  const last = new Date(lastSeen).getTime();
  return Date.now() - last < 90_000; // 90 sekunder
}

export default async function ScreensPage() {
  const { data, error } = await supabaseAdmin.from("screens").select("id,name,last_seen_at").order("name", { ascending: true });
  if (error) throw error;

  const base =
    process.env.NEXT_PUBLIC_BASE_URL ??
    // fallback för lokal dev
    "http://localhost:3000";

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Skärmar</h1>

      <div className="grid md:grid-cols-2 gap-4">
        {data?.map((s) => {
          const url = `${base}/display/${s.id}`;
          const qr = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
            url
          )}`;

          return (
            <div key={s.id} className="rounded-xl border p-4 bg-[var(--panel)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-medium">{s.name ?? "Namnlös skärm"}</div>
                  <div className="text-sm text-[var(--ink-600)]">ID: {s.id}</div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    isOnline(s.last_seen_at)
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {isOnline(s.last_seen_at) ? "Online" : "Offline"}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-3">
                {/* QR */}
                <img src={qr} alt="QR" className="w-24 h-24 rounded-md border" />
                <div className="flex-1">
                  <div className="text-sm text-[var(--ink-700)] break-all">{url}</div>
                  <div className="mt-2 flex gap-2">
                    <CopyButton text={url} />
                    <Link
                      className="text-sm rounded-lg border px-3 py-1.5 hover:bg-[var(--blue-50)]"
                      href={`/display/${s.id}`}
                      target="_blank"
                    >
                      Öppna i ny flik
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-sm text-[var(--ink-600)]">
        Tip: Klistra in URL:en på din Raspberry Pi i kiosk-läget. Pi rapporterar “online” när den
        skickar heartbeat.
      </p>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  return (
    <button
      className="text-sm rounded-lg border px-3 py-1.5 hover:bg-[var(--blue-50)]"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        alert("Kopierad!");
      }}
    >
      Kopiera URL
    </button>
  );
}
