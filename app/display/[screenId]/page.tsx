// app/display/[screenId]/page.tsx
import DisplayClient from "./DisplayClient";

export default function Page({
  params,
}: {
  params: { screenId: string };
}) {
  // Skicka screenId som prop till client-komponenten (inga params-varningar)
  return <DisplayClient screenId={params.screenId} />;
}
