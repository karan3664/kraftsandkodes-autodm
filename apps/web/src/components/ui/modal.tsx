import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Modal = DialogPrimitive.Root;
export const ModalTrigger = DialogPrimitive.Trigger;
export const ModalClose = DialogPrimitive.Close;

export function ModalContent({
  className,
  children,
  title,
}: {
  className?: string;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-[80] w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-800 bg-[#111113] p-6 shadow-[0_0_80px_rgba(124,58,237,0.2)]",
          className,
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <DialogPrimitive.Title className="text-lg font-semibold text-white">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close className="rounded-full p-1 text-zinc-400 hover:bg-zinc-900 hover:text-white">
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </div>
        <DialogPrimitive.Description className="sr-only">
          {title}
        </DialogPrimitive.Description>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
