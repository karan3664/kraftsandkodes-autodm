"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";
import { appHref } from "@/lib/hosts";
import { cn } from "@/lib/utils";

type AuthLinkProps = React.ComponentPropsWithoutRef<"a"> & {
  href: string;
};

function prefetchApp(url: string) {
  if (typeof document === "undefined") return;
  if (document.head.querySelector(`link[data-autodm-prefetch="${url}"]`)) {
    return;
  }
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.as = "document";
  link.href = url;
  link.dataset.autodmPrefetch = url;
  document.head.appendChild(link);
}

export const AuthLink = React.forwardRef<HTMLAnchorElement, AuthLinkProps>(
  function AuthLink(
    { href, className, children, onClick, onMouseEnter, onFocus, ...props },
    ref,
  ) {
    const [pending, setPending] = React.useState(false);
    const dest = href.startsWith("http") ? href : appHref(href);

    React.useEffect(() => {
      const id = window.setTimeout(() => prefetchApp(dest), 250);
      return () => window.clearTimeout(id);
    }, [dest]);

    return (
      <a
        ref={ref}
        href={dest}
        {...props}
        className={cn(pending && "pointer-events-none opacity-80", className)}
        aria-busy={pending}
        onMouseEnter={(event) => {
          prefetchApp(dest);
          onMouseEnter?.(event);
        }}
        onFocus={(event) => {
          prefetchApp(dest);
          onFocus?.(event);
        }}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented || event.metaKey || event.ctrlKey) return;
          setPending(true);
        }}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Opening…</span>
          </>
        ) : (
          children
        )}
      </a>
    );
  },
);
