// app/display/[screenId]/page.tsx
import DisplayClient from "./DisplayClient";

type Params = { params: { screenId: string } };

export default async function Page({ params }: Params) {
  // server-komponent – skickar screenId till client
  const screenId = params.screenId;
  return <DisplayClient screenId={screenId} />;
}
