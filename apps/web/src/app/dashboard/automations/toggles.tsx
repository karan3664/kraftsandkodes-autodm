"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AutomationToggles({
  id,
  enabled,
  compact = false,
}: {
  id: string;
  enabled: boolean;
  compact?: boolean;
}) {
  const router = useRouter();

  async function toggle(next: boolean) {
    const response = await fetch(`/api/automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    const body = (await response.json()) as {
      success: boolean;
      error?: { message: string };
    };
    if (!body.success) {
      toast.error(body.error?.message ?? "Update failed", {
        action:
          body.error?.message === "Free plan includes 1 active automation."
            ? {
                label: "Upgrade to Creator",
                onClick: () => router.push("/dashboard/settings?tab=billing"),
              }
            : undefined,
      });
      return;
    }
    router.refresh();
  }

  async function remove() {
    const response = await fetch(`/api/automations/${id}`, {
      method: "DELETE",
    });
    const body = (await response.json()) as {
      success: boolean;
      error?: { message: string };
    };
    if (!body.success) {
      toast.error(body.error?.message ?? "Delete failed");
      return;
    }
    toast.success("Automation deleted");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <Switch checked={enabled} onCheckedChange={toggle} />
      {compact ? null : (
        <>
          <Button size="sm" variant="secondary" asChild>
            <a href={`/dashboard/automations/${id}`}>Edit</a>
          </Button>
          <Button size="sm" variant="ghost" onClick={remove}>
            Delete
          </Button>
        </>
      )}
    </div>
  );
}
