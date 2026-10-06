import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-xl border border-zinc-800 bg-black px-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-sm font-medium text-zinc-200", className)}
      {...props}
    />
  );
}

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-28 w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
