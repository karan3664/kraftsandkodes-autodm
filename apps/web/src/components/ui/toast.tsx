import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      theme="dark"
      position="top-right"
      toastOptions={{
        className: "bg-zinc-950 border border-zinc-800 text-white",
      }}
    />
  );
}
