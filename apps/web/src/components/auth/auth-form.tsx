"use client";

import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  loginSchema,
  signupSchema,
  type LoginInput,
  type SignupInput,
} from "@kdl/shared";
import {
  Activity,
  Clock,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MessageCircle,
  TrendingUp,
  User,
  Users,
  Zap,
} from "lucide-react";
import { BrandLockup } from "@/components/brand/logo";
import { InstagramMark } from "@/components/brand/instagram-mark";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DASHBOARD_PATH, safeAppPath } from "@/lib/auth/next-path";
import { MARKETING_ORIGIN } from "@/lib/hosts";

const signupFormSchema = signupSchema
  .extend({
    confirmPassword: z.string().min(1),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupFormSchema>;

async function submitAuth(path: string, values: LoginInput | SignupInput) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const body = (await response.json()) as {
    success: boolean;
    error?: { message: string };
  };
  if (!body.success) {
    toast.error(body.error?.message ?? "Authentication failed");
    return false;
  }
  return true;
}

const inputClass =
  "h-12 rounded-2xl border-white/10 bg-[#121018] pl-10 [color-scheme:dark] [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#121018]";

function GoogleButton({ next }: { next: string }) {
  const href =
    next === "/dashboard"
      ? "/api/auth/google"
      : `/api/auth/google?next=${encodeURIComponent(next)}`;
  return (
    <a
      href={href}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white text-sm font-medium text-zinc-900"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Continue with Google
    </a>
  );
}

function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
      <span className="h-px flex-1 bg-white/10" />
      Or
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="mt-5 max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#0c0a12] shadow-[0_20px_80px_rgba(124,58,237,0.25)]">
      <div className="flex">
        <aside className="w-24 shrink-0 space-y-1 border-r border-white/5 bg-black/40 p-2.5">
          <p className="mb-2 text-[8px] font-semibold tracking-widest text-violet-300">
            KDL
          </p>
          {["Overview", "Instagram", "Automations", "Activity"].map(
            (item, index) => (
              <p
                key={item}
                className={
                  index === 0
                    ? "rounded-full bg-violet-600 px-2 py-1 text-[9px] text-white"
                    : "px-2 py-1 text-[9px] text-zinc-500"
                }
              >
                {item}
              </p>
            ),
          )}
        </aside>
        <div className="min-w-0 flex-1 p-2.5">
          <p className="text-[10px] font-semibold text-white">Overview</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/10 p-2">
              <p className="text-[8px] text-zinc-500">Comments</p>
              <p className="text-sm font-semibold text-white">Activity</p>
            </div>
            <div className="rounded-xl border border-white/10 p-2">
              <p className="text-[8px] text-zinc-500">Messages</p>
              <p className="text-sm font-semibold text-white">Sent</p>
            </div>
          </div>
          <div className="mt-2 space-y-1">
            {["Replied", "Failed", "Sent"].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between rounded-lg bg-white/5 px-2 py-1 text-[8px] text-zinc-400"
              >
                <span>Keyword match</span>
                <span
                  className={
                    item === "Failed" ? "text-red-300" : "text-emerald-300"
                  }
                >
                  {item}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 ml-auto flex w-fit items-center gap-2 rounded-2xl border border-white/10 bg-[#1a1028] px-2.5 py-1.5">
            <InstagramMark size={28} className="rounded-lg" />
            <span>
              <span className="block text-[11px] font-semibold text-white">
                Creators &amp; Businesses
              </span>
              <span className="text-[9px] text-zinc-400">Comment → DM</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthSplit({
  mode,
  nextQuery,
  children,
}: {
  mode: "login" | "signup";
  nextQuery: string;
  children: React.ReactNode;
}) {
  const signup = mode === "signup";
  const homeHref =
    process.env.NODE_ENV === "development" ? "/" : MARKETING_ORIGIN;
  return (
    <div className="relative flex min-h-svh flex-col overflow-x-hidden bg-[#07060c]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(39,39,42,0.28)_1px,transparent_1px),linear-gradient(90deg,rgba(39,39,42,0.28)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="pointer-events-none absolute right-[-10%] top-[-20%] h-[520px] w-[520px] rounded-full bg-violet-600/25 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-20%] left-[20%] h-[360px] w-[360px] rounded-full bg-fuchsia-600/15 blur-[100px]" />

      <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-12">
        <a
          href={homeHref}
          className="min-w-0 shrink-0"
          aria-label="KRAFTSANDKODES home"
        >
          <BrandLockup
            size={72}
            className="h-12 w-12 sm:h-14 sm:w-14 lg:h-[72px] lg:w-[72px]"
          />
        </a>
        <p className="text-right text-xs text-zinc-400 sm:text-sm">
          {signup ? (
            <>
              <span className="hidden sm:inline">
                Already have an account?{" "}
              </span>
              <Link
                href={`/auth/login${nextQuery}`}
                className="font-medium text-violet-300"
              >
                Log in →
              </Link>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">New here? </span>
              <Link
                href={`/auth/signup${nextQuery}`}
                className="font-medium text-violet-300"
              >
                Create an account →
              </Link>
            </>
          )}
        </p>
      </header>

      <div className="relative z-10 mx-auto grid w-full min-w-0 max-w-6xl flex-1 items-start gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-8 lg:px-12 lg:py-6">
        <section className="hidden min-h-0 lg:block">
          <p className="mb-3 inline-flex rounded-full border border-violet-500/30 bg-violet-600/15 px-3 py-1 text-xs text-violet-200">
            {signup ? "Automate Instagram Comments" : "Welcome Back"}
          </p>
          <h1 className="text-4xl font-semibold leading-[1.15] text-white">
            {signup ? (
              <>
                Turn Comments
                <br />
                <span className="text-transparent bg-gradient-to-r from-violet-300 to-fuchsia-400 bg-clip-text">
                  Into Conversations
                </span>
              </>
            ) : (
              <>
                Manage Your
                <br />
                <span className="text-transparent bg-gradient-to-r from-violet-300 to-fuchsia-400 bg-clip-text">
                  Instagram Automations
                </span>
              </>
            )}
          </h1>
          <p className="mt-3 max-w-md text-sm text-zinc-400">
            {signup
              ? "Automatically reply to Instagram comments, save time, and grow your audience."
              : "Sign in to your workspace and continue growing with KRAFTSANDKODES."}
          </p>
          <ul className="mt-5 space-y-2.5">
            {(signup
              ? [
                  {
                    icon: MessageCircle,
                    title: "Keyword-based Auto Replies",
                    body: "Respond instantly to relevant comments",
                  },
                  {
                    icon: TrendingUp,
                    title: "Boost Engagement",
                    body: "Turn comments into opportunities",
                  },
                  {
                    icon: Clock,
                    title: "Works 24/7",
                    body: "Never miss a potential customer",
                  },
                  {
                    icon: Users,
                    title: "Built for Creators & Businesses",
                    body: "Simple, powerful and easy to use",
                  },
                ]
              : [
                  {
                    icon: Zap,
                    title: "View your automations",
                    body: "Manage and update keyword rules",
                  },
                  {
                    icon: Activity,
                    title: "Track real-time activity",
                    body: "See comments and replies",
                  },
                  {
                    icon: Users,
                    title: "Multiple Instagram accounts",
                    body: "Connect your professional account",
                  },
                  {
                    icon: TrendingUp,
                    title: "Powerful analytics",
                    body: "Measure sent, failed, and waiting replies",
                  },
                ]
            ).map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.45)]">
                  <item.icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">
                    {item.title}
                  </span>
                  <span className="text-xs text-zinc-500">{item.body}</span>
                </span>
              </li>
            ))}
          </ul>
          <DashboardPreview />
        </section>

        <section className="flex justify-center py-2 lg:justify-end">
          <div className="w-full max-w-[400px] rounded-[24px] border border-white/10 bg-[#0d0b14]/90 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:rounded-[28px] sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.28em] text-violet-400">
              KRAFTSANDKODES
            </p>
            {children}
          </div>
        </section>
      </div>

      <footer className="relative z-10 mx-auto hidden w-full max-w-6xl shrink-0 grid-cols-4 gap-4 px-12 py-4 text-xs text-zinc-400 lg:grid">
        {[
          ["10K+", "Active Users"],
          ["1M+", "Comments Processed"],
          ["99%", "Uptime"],
          ["24/7", "Automation"],
        ].map(([value, label]) => (
          <div key={label} className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600/20 text-violet-300">
              <Zap className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-white">
                {value}
              </span>
              {label}
            </span>
          </div>
        ))}
      </footer>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  icon: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        {children}
      </div>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}

const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { id: string }
>(({ id, className, ...props }, ref) => {
  const [show, setShow] = useState(false);
  return (
    <>
      <Input
        id={id}
        ref={ref}
        type={show ? "text" : "password"}
        {...props}
        className={cn(inputClass, "px-10", className)}
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
        onClick={() => setShow((value) => !value)}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </>
  );
});
PasswordInput.displayName = "PasswordInput";

function LoginForm({ next, nextQuery }: { next: string; nextQuery: string }) {
  const router = useRouter();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("error") === "google") {
      toast.error("Google sign-in failed. Try again.");
    }
  }, []);

  async function onSubmit(values: LoginInput) {
    if (await submitAuth("/api/auth/login", values)) {
      router.push(next);
      router.refresh();
    }
  }

  return (
    <AuthSplit mode="login" nextQuery={nextQuery}>
      <h2 className="mt-2 text-2xl font-semibold text-white">Welcome back</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Sign in to your Karan Digital Labs workspace.
      </p>
      <form className="mt-5 space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <Field
          id="email"
          label="Email address"
          icon={Mail}
          error={form.formState.errors.email?.message}
        >
          <Input
            id="email"
            type="email"
            placeholder="you@yourdomain.com"
            className={inputClass}
            {...form.register("email")}
          />
        </Field>
        <Field
          id="password"
          label="Password"
          icon={Lock}
          error={form.formState.errors.password?.message}
        >
          <PasswordInput id="password" {...form.register("password")} />
        </Field>
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="accent-violet-600" />
            Remember me
          </label>
          <button
            type="button"
            className="text-violet-300"
            onClick={() =>
              toast.message("Password reset is not available yet.")
            }
          >
            Forgot password?
          </button>
        </div>
        <Button
          className="h-12 w-full text-base"
          type="submit"
          disabled={form.formState.isSubmitting}
        >
          Sign in →
        </Button>
        <OrDivider />
        <GoogleButton next={next} />
        <p className="text-center text-[11px] text-zinc-500">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </form>
    </AuthSplit>
  );
}

function SignupForm({ next, nextQuery }: { next: string; nextQuery: string }) {
  const router = useRouter();
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: SignupFormValues) {
    const { confirmPassword: _, ...payload } = values;
    if (await submitAuth("/api/auth/signup", payload)) {
      router.push(next);
      router.refresh();
    }
  }

  return (
    <AuthSplit mode="signup" nextQuery={nextQuery}>
      <h2 className="mt-2 text-2xl font-semibold text-white">
        Create your account
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        Start automating your Instagram comments today.
      </p>
      <form className="mt-5 space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <Field
          id="name"
          label="Full name"
          icon={User}
          error={form.formState.errors.name?.message}
        >
          <Input
            id="name"
            placeholder="Enter your full name"
            className={inputClass}
            {...form.register("name")}
          />
        </Field>
        <Field
          id="email"
          label="Email address"
          icon={Mail}
          error={form.formState.errors.email?.message}
        >
          <Input
            id="email"
            type="email"
            placeholder="you@yourdomain.com"
            className={inputClass}
            {...form.register("email")}
          />
        </Field>
        <Field
          id="password"
          label="Password"
          icon={Lock}
          error={form.formState.errors.password?.message}
        >
          <PasswordInput
            id="password"
            placeholder="Create a strong password"
            {...form.register("password")}
          />
        </Field>
        <Field
          id="confirmPassword"
          label="Confirm password"
          icon={Lock}
          error={form.formState.errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirmPassword"
            placeholder="Confirm your password"
            {...form.register("confirmPassword")}
          />
        </Field>
        <Button
          className="h-12 w-full text-base"
          type="submit"
          disabled={form.formState.isSubmitting}
        >
          Create account →
        </Button>
        <OrDivider />
        <GoogleButton next={next} />
        <p className="text-center text-[11px] text-zinc-500">
          By creating an account, you agree to our Terms of Service and Privacy
          Policy.
        </p>
        <p className="text-center text-[11px] text-zinc-500">
          Start free. No credit card required.
        </p>
      </form>
    </AuthSplit>
  );
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const params = useSearchParams();
  const next = safeAppPath(params.get("next"));
  const nextQuery =
    next === DASHBOARD_PATH ? "" : `?next=${encodeURIComponent(next)}`;
  return mode === "signup" ? (
    <SignupForm next={next} nextQuery={nextQuery} />
  ) : (
    <LoginForm next={next} nextQuery={nextQuery} />
  );
}
