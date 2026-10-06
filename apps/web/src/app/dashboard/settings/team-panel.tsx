"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { TEAM_LIMIT_MESSAGE } from "@/lib/plans";
import { toast } from "sonner";

type TeamPayload = {
  owner: { id: string; name: string; role: "owner"; status: "accepted" };
  members: Array<{
    id: string;
    email: string;
    name: string | null;
    role: "admin" | "member";
    status: string;
    accountIds: string[];
    inviteExpiresAt: string | null;
  }>;
  used: number;
  limit: number;
  teamLive: boolean;
  leftoverTeam: boolean;
  canInvite: boolean;
};

export function TeamPanel({
  team,
  accounts,
}: {
  team: TeamPayload;
  accounts: Array<{ id: string; username: string }>;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [busy, setBusy] = useState<string | null>(null);

  async function post(path: string, body: unknown, label: string) {
    setBusy(label);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await response.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!json.success) {
        toast.error(json.error?.message ?? "Request failed.");
        return;
      }
      toast.success("Updated.");
      router.refresh();
    } catch {
      toast.error("Request failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white">
        <Users className="h-4 w-4 text-violet-300" />
        Team Members
      </h2>
      {team.leftoverTeam ? (
        <p className="mt-2 text-sm text-amber-200">
          Your new plan does not include team members. Team data is kept.
          Restrict access by removing members, or upgrade back to Agency.
        </p>
      ) : null}
      <p className="mt-2 text-xs text-zinc-500">
        {team.used} / {Math.max(team.limit, 3)} seats · owner counts as 1
      </p>

      <ul className="mt-4 space-y-3">
        <li className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <p className="text-sm text-white">{team.owner.name}</p>
          <p className="text-xs text-zinc-500">Owner · Active</p>
        </li>
        {team.members
          .filter(
            (row) => row.status === "pending" || row.status === "accepted",
          )
          .map((row) => (
            <li
              key={row.id}
              className="rounded-2xl border border-white/10 bg-black/30 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-white">{row.name ?? row.email}</p>
                  <p className="text-xs text-zinc-500">
                    {row.email} · {row.role === "admin" ? "Admin" : "Member"} ·{" "}
                    {row.status === "pending" ? "Pending" : "Active"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {row.status === "accepted" ? (
                    <select
                      className="h-9 rounded-xl border border-white/10 bg-black px-2 text-xs text-white"
                      value={row.role}
                      onChange={(event) =>
                        post(
                          `/api/team/${row.id}`,
                          {
                            action: "role",
                            role: event.target.value,
                          },
                          `role:${row.id}`,
                        )
                      }
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                  ) : null}
                  {row.status === "pending" ? (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy !== null || !team.teamLive}
                        onClick={() =>
                          post(
                            `/api/team/${row.id}`,
                            { action: "resend" },
                            `resend:${row.id}`,
                          )
                        }
                      >
                        Resend
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy !== null}
                        onClick={() =>
                          post(
                            `/api/team/${row.id}`,
                            { action: "cancel" },
                            `cancel:${row.id}`,
                          )
                        }
                      >
                        Cancel invitation
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busy !== null}
                      onClick={() =>
                        post(
                          `/api/team/${row.id}`,
                          { action: "remove" },
                          `remove:${row.id}`,
                        )
                      }
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              {row.role === "member" && accounts.length > 0 ? (
                <div className="mt-3 space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Assigned Instagram accounts
                  </p>
                  {accounts.map((account) => {
                    const checked = row.accountIds.includes(account.id);
                    return (
                      <label
                        key={account.id}
                        className="flex items-center gap-2 text-sm text-zinc-300"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = checked
                              ? row.accountIds.filter((id) => id !== account.id)
                              : [...row.accountIds, account.id];
                            post(
                              `/api/team/${row.id}`,
                              { action: "assign", accountIds: next },
                              `assign:${row.id}`,
                            );
                          }}
                        />
                        @{account.username}
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </li>
          ))}
      </ul>

      {team.canInvite ? (
        <form
          className="mt-6 grid gap-3 sm:grid-cols-[1fr_8rem_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            post("/api/team", { email, role }, "invite");
            setEmail("");
          }}
        >
          <div>
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              className="mt-1 h-11 w-full rounded-xl border border-zinc-800 bg-black px-3 text-sm text-white"
              value={role}
              onChange={(event) =>
                setRole(event.target.value as "admin" | "member")
              }
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button className="sm:mt-6" disabled={busy !== null}>
            Send Invitation
          </Button>
        </form>
      ) : team.teamLive ? (
        <p className="mt-6 text-sm text-zinc-300">{TEAM_LIMIT_MESSAGE}</p>
      ) : null}
    </section>
  );
}
