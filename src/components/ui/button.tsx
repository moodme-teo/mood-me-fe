import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Pill 버튼 — mood me 시스템의 유일한 기본 형태. 깊이는 테두리가 아니라 색조
 * 그림자로만 표현한다. hover 에서는 위치나 그림자 깊이 대신 그라디언트 stop
 * 위치를 바꿔 오른쪽 컬러 면적을 넓힌다.
 * tone 은 그라디언트 fill·전경색·그림자 색을 함께 결정한다(primary 변형에서).
 */
const buttonVariants = cva(
  "mood-button-gradient group/button inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2.5 whitespace-nowrap rounded-full border-0 font-body outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "",
        secondary: "bg-surface-sunken text-foreground",
        ghost: "bg-transparent text-foreground hover:bg-surface-sunken",
      },
      tone: {
        ink: "",
        pink: "",
        violet: "",
        cyan: "",
        green: "",
        mustard: "",
        sand: "",
      },
      size: {
        lg: "px-[38px] py-[14px] text-body-md font-bold [&_svg]:size-[22px]",
        md: "px-[28px] py-[10px] text-caption font-semibold [&_svg]:size-[19px]",
        sm: "px-[20px] py-[7px] text-caption font-medium [&_svg]:size-4",
        "icon-lg": "size-[54px] p-0 [&_svg]:size-[22px]",
        "icon-md": "size-12 p-0 [&_svg]:size-[19px]",
        "icon-sm": "size-[38px] p-0 [&_svg]:size-4",
      },
    },
    compoundVariants: [
      {
        variant: "primary",
        tone: "ink",
        className: "bg-[image:var(--gradient-ink)] text-white shadow-ink",
      },
      {
        variant: "primary",
        tone: "pink",
        className: "bg-[image:var(--gradient-pink)] text-white shadow-pink",
      },
      {
        variant: "primary",
        tone: "violet",
        className: "bg-[image:var(--gradient-violet)] text-white shadow-violet",
      },
      {
        variant: "primary",
        tone: "cyan",
        className: "bg-[image:var(--gradient-cyan)] text-white shadow-cyan",
      },
      {
        variant: "primary",
        tone: "green",
        className:
          "bg-[image:var(--gradient-green)] text-[#173d05] shadow-green",
      },
      {
        variant: "primary",
        tone: "mustard",
        className:
          "bg-[image:var(--gradient-mustard)] text-white shadow-mustard",
      },
      {
        variant: "primary",
        tone: "sand",
        className: "bg-[image:var(--gradient-sand)] shadow-ink",
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
