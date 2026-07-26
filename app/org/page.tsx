import { Metadata } from "next";
import { Suspense } from "react";
import OrgPageClient from "./OrgPageClient";

export const metadata: Metadata = {
  title: "Organization - IncogniAI",
  description: "Manage your IncogniAI organization and billing.",
};

export default function OrgPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <OrgPageClient />
    </Suspense>
  );
}
