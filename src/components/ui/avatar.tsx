import { cva, type VariantProps } from "class-variance-authority";
import { Avatar as AvatarPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * 원형 아바타 — 테두리 대신 색조 링 그림자로 depth 를 준다(tone). 기본(none)은
 * 중립 카드 그림자.
 */
const avatarVariants = cva(
  "relative flex size-10 shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      tone: {
        none: "shadow-card",
        pink: "shadow-pink",
        violet: "shadow-violet",
        cyan: "shadow-cyan",
        green: "shadow-green",
        mustard: "shadow-mustard",
      },
    },
    defaultVariants: {
      tone: "none",
    },
  },
);

function Avatar({
  className,
  tone,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> &
  VariantProps<typeof avatarVariants>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(avatarVariants({ tone, className }))}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-[var(--placeholder-fill)] text-muted-foreground text-label",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback, avatarVariants };
