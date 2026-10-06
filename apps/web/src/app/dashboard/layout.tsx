import { isAdmin } from "@/lib/auth/admin";
import { requireUser } from "@/lib/auth/session";
import { loadWorkspace } from "@/lib/team/workspace";
import {
  canConnectAnotherAccount,
  resolveWorkspaceInstagramAccount,
} from "@/lib/instagram-selection";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  if (!user) {
    redirect("/auth/login");
  }
  const ws = await loadWorkspace(user);
  const { accounts, selected } = await resolveWorkspaceInstagramAccount(ws);
  const connectQuota = await canConnectAnotherAccount(ws.ownerUserId);

  return (
    <DashboardShell
      name={user.name}
      admin={isAdmin(user)}
      accounts={accounts.map((item) => ({
        id: item.id,
        username: item.username,
        profilePictureUrl: item.profilePictureUrl,
      }))}
      selectedAccountId={selected?.id ?? null}
      canAddAccount={ws.canManageIg && connectQuota.ok}
    >
      {children}
    </DashboardShell>
  );
}
