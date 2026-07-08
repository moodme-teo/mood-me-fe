import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Pill 버튼 — mood me 시스템의 유일한 기본 형태. 깊이는 테두리가 아니라 색조
 * 그림자로만 표현되고, hover 시 위로 떠오르고(-translateY) press 시 눌린다(scale).
 * tone 은 그라디언트 fill·전경색·그림자 색을 함께 결정한다(primary 변형에서).
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2.5 whitespace-nowrap rounded-full border-0 font-body outline-none transition-all duration-200 ease-spring will-change-transform hover:-translate-y-[3px] focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px active:scale-[0.97] active:duration-100 active:ease-standard motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "",
        secondary: "bg-surface-sunken text-foreground hover:shadow-card-hover",
        ghost: "bg-transparent text-foreground hover:bg-surface-sunken",
      },
      tone: {
        ink: "",
        pink: "",
        violet: "",
        cyan: "",
        green: "",
        mustard: "",
      },
      size: {
        lg: "px-[36px] py-[18px] text-heading-md [&_svg]:size-[22px]",
        md: "px-[26px] py-[13px] text-body-lg [&_svg]:size-[19px]",
        sm: "px-[18px] py-[9px] text-body-sm [&_svg]:size-4",
        "icon-lg": "size-[60px] p-0 [&_svg]:size-[22px]",
        "icon-md": "size-12 p-0 [&_svg]:size-[19px]",
        "icon-sm": "size-[38px] p-0 [&_svg]:size-4",
      },
    },
    compoundVariants: [
      {
        variant: "primary",
        tone: "ink",
        className:
          "bg-[image:var(--gradient-ink)] text-white shadow-ink hover:shadow-ink-hover active:shadow-ink-press",
      },
      {
        variant: "primary",
        tone: "pink",
        className:
          "bg-[image:var(--gradient-pink)] text-[#3a0d24] shadow-pink hover:shadow-pink-hover active:shadow-pink-press",
      },
      {
        variant: "primary",
        tone: "violet",
        className:
          "bg-[image:var(--gradient-violet)] text-white shadow-violet hover:shadow-violet-hover active:shadow-violet-press",
      },
      {
        variant: "primary",
        tone: "cyan",
        className:
          "bg-[image:var(--gradient-cyan)] text-white shadow-cyan hover:shadow-cyan-hover active:shadow-cyan-press",
      },
      {
        variant: "primary",
        tone: "green",
        className:
          "bg-[image:var(--gradient-green)] text-[#173d05] shadow-green hover:shadow-green-hover active:shadow-green-press",
      },
      {
        variant: "primary",
        tone: "mustard",
        className:
          "bg-[image:var(--gradient-mustard)] text-white shadow-mustard hover:shadow-mustard-hover active:shadow-mustard-press",
      },
    ],
    defaultVariants: {
      variant: "primary",
      tone: "violet",
      size: "lg",
    },
  },
);

function Button({
  className,
  variant,
  tone,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-tone={tone}
      data-size={size}
      className={cn(buttonVariants({ variant, tone, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
