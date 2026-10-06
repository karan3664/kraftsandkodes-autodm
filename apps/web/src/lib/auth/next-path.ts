const PAID_PLANS = new Set(["creator", "pro", "agency"]);

export const DASHBOARD_PATH = "/dashboard";
export const BILLING_PATH = "/dashboard/settings?tab=billing";

export function billingPath(plan?: "creator" | "pro" | "agency") {
  return plan ? `${BILLING_PATH}&plan=${plan}` : BILLING_PATH;
}

export function signupForPlan(plan?: "creator" | "pro" | "agency") {
  if (!plan) return "/auth/signup";
  return `/auth/signup?next=${encodeURIComponent(billingPath(plan))}`;
}

export function safeAppPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return DASHBOARD_PATH;
  }
  try {
    const url = new URL(raw, "https://app.kraftsandkodes.com");
    if (/^\/invite\/[0-9a-f]{64}$/i.test(url.pathname)) {
      const params = new URLSearchParams();
      if (url.searchParams.get("accept") === "1") {
        params.set("accept", "1");
      }
      const query = params.toString();
      return query ? `${url.pathname}?${query}` : url.pathname;
    }
    if (
      url.pathname === DASHBOARD_PATH &&
      ![...url.searchParams.keys()].length
    ) {
      return DASHBOARD_PATH;
    }
    if (url.pathname !== "/dashboard/settings") {
      return DASHBOARD_PATH;
    }
    const params = new URLSearchParams();
    const tab = url.searchParams.get("tab");
    if (tab === "billing" || tab === "team") {
      params.set("tab", tab);
    }
    const plan = url.searchParams.get("plan");
    if (plan && PAID_PLANS.has(plan)) {
      params.set("tab", "billing");
      params.set("plan", plan);
    }
    const query = params.toString();
    return query ? `/dashboard/settings?${query}` : "/dashboard/settings";
  } catch {
    return DASHBOARD_PATH;
  }
}
