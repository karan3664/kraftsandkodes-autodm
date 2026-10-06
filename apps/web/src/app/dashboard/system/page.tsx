import { isAdmin } from "@/lib/auth/admin";
import { requireUser } from "@/lib/auth/session";
import { getEnv, isMockMode } from "@/lib/env";
import { getMetaReadiness, getSystemChecks } from "@/lib/system-status";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function SystemPage() {
  const user = await requireUser();
  if (!user) {
    redirect("/auth/login");
  }
  if (!isAdmin(user)) {
    redirect("/dashboard");
  }

  const env = getEnv();
  const [checks, readiness] = await Promise.all([
    getSystemChecks(),
    getMetaReadiness(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">System</h1>
        <p className="mt-2 text-zinc-400">
          Developer status. Secrets are never displayed.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Meta Integration Readiness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {readiness.map((check) => (
            <div
              key={check.label}
              className="flex min-w-0 flex-wrap items-center justify-between gap-2 overflow-hidden rounded-xl border border-zinc-800 px-3 py-3 sm:px-4"
            >
              <span className="min-w-0 text-sm text-zinc-300">
                {check.label}
              </span>
              <Badge
                className="max-w-full"
                tone={check.ok ? "success" : "warning"}
              >
                {check.value}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Runtime</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {checks.map((check) => (
            <div
              key={check.label}
              className="flex min-w-0 flex-wrap items-center justify-between gap-2 overflow-hidden rounded-xl border border-zinc-800 px-3 py-3 sm:px-4"
            >
              <span className="min-w-0 text-sm text-zinc-300">
                {check.label}
              </span>
              <Badge
                className="max-w-full"
                tone={check.ok ? "success" : "warning"}
              >
                {check.value}
              </Badge>
            </div>
          ))}
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 overflow-hidden rounded-xl border border-zinc-800 px-3 py-3 sm:px-4">
            <span className="min-w-0 text-sm text-zinc-300">
              Webhook endpoint
            </span>
            <Badge className="max-w-full" tone="purple">
              /api/webhooks/instagram
            </Badge>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 overflow-hidden rounded-xl border border-zinc-800 px-3 py-3 sm:px-4">
            <span className="min-w-0 text-sm text-zinc-300">Environment</span>
            <Badge>{env.NODE_ENV}</Badge>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 overflow-hidden rounded-xl border border-zinc-800 px-3 py-3 sm:px-4">
            <span className="text-sm text-zinc-300">Developer simulation</span>
            <Badge tone={isMockMode() ? "purple" : "neutral"}>
              {isMockMode() ? "Available" : "Production locked"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
