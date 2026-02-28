import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import TimezoneDetector from "@/components/dashboard/TimezoneDetector";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Redirect to onboarding if not complete
  if (!profile?.onboarding_complete) {
    redirect("/onboarding");
  }

  return (
    <DashboardShell user={user} profile={profile}>
      <TimezoneDetector />
      {children}
    </DashboardShell>
  );
}
