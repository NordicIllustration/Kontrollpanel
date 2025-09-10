// app/dashboard/screens/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import ScreensClient from "./ScreensClient";

export default async function Page() {
  // Server-komponenten returnerar vår Client-komponent utan att skicka funktioner
  return <ScreensClient />;
}
