import Image from "next/image";
import { cn } from "@/lib/utils";

/** Branded Instagram graphic from the landing asset pack, cropped to the tile. */
export function InstagramMark({
  size = 48,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/brand/instagram-hero-icon.png"
        alt=""
        width={120}
        height={120}
        className="h-full w-full scale-[1.6] object-cover"
      />
    </span>
  );
}
