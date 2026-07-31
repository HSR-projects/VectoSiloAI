import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getGoogleConnection } from "@/lib/appConnections";
import { ConnectorsClient } from "./ConnectorsClient";

export const metadata = {
  title: "Connectors - IncogniAI",
};

export default async function ConnectorsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const googleConn = await getGoogleConnection(user.id);
  const isGoogleConnected = !!googleConn;

  // The actual interactive UI is a client component so we can handle modal state
  return <ConnectorsClient isGoogleConnected={isGoogleConnected} />;
}
