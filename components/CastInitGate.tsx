"use client";

import { usePathname } from "next/navigation";
// importera din befintliga CastInit (eller annan init-komponent som använder supabase)
import CastInit from "@/components/CastInit";

/**
 * Rendera INTE CastInit på /display/* (där vi vill vara helt "rena")
 */
export default function CastInitGate() {
  const pathname = usePathname();
  if (pathname?.startsWith("/display")) return null;
  return <CastInit />;
}
