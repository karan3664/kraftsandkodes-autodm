import { requireUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { resolveWorkspaceInstagramAccount } from "@/lib/instagram-selection";
import { loadWorkspace } from "@/lib/team/workspace";
import { CreateAutomationWizard } from "../create-wizard";

export default async function NewAutomationPage() {
  const user = await requireUser();
  if (!user) {
    redirect("/auth/login");
  }

  const ws = await loadWorkspace(user);
  const { accounts, selected } = await resolveWorkspaceInstagramAccount(ws);

  if (accounts.length === 0) {
    redirect("/dashboard/instagram");
  }

  return (
    <CreateAutomationWizard
      selectedAccountId={selected?.id}
      accounts={accounts.map((account) => ({
        id: account.id,
        username: account.username,
      }))}
    />
  );
}
