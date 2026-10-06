import Image from "next/image";
import { cn } from "@/lib/utils";
import { PRODUCT_NAME } from "@/lib/hosts";

export function BrandLogo({
  className,
  size = 64,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <Image
      src="/brand/logo.jpg"
      alt={PRODUCT_NAME}
      width={size}
      height={size}
      quality={100}
      sizes={`${size}px`}
      className={cn("shrink-0 object-contain", className)}
      priority
    />
  );
}

export function BrandLockup({
  className,
  size = 64,
}: {
  className?: string;
  size?: number;
}) {
  return <BrandLogo className={className} size={size} />;
}
