import {
  Activity,
  Instagram,
  LayoutDashboard,
  Settings,
  Workflow,
} from "lucide-react";

export const DASHBOARD_NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/instagram", label: "Instagram", icon: Instagram },
  { href: "/dashboard/automations", label: "Automations", icon: Workflow },
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

export const MARKETING_NAV = [
  ["/", "Home"],
  ["/features", "Features"],
  ["/how-it-works", "How it works"],
  ["/pricing", "Pricing"],
  ["/faq", "FAQ"],
  ["/contact", "Contact"],
] as const;
