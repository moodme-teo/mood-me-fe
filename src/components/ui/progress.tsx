import { cva, type VariantProps } from "class-variance-authority";
import { Progress as ProgressPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

/** 채워지는 트랙에 색조 글로우가 얹힌 진행률 바. */
const progressVariants = cva(
  "w-full overflow-hidden rounded-full bg-gray-100",
  {
    variants: {
      size: {
        lg: "h-3.5",
        md: "h-2.5",
        sm: "h-1.5",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

const indicatorVariants = cva(
  "size-full flex-1 rounded-full transition-transform duration-300 ease-standard",
  {
    variants: {
      tone: {
        pink: "bg-[image:var(--gradient-pink)] shadow-pink",
        violet: "bg-[image:var(--gradient-violet)] shadow-violet",
        cyan: "bg-[image:var(--gradient-cyan)] shadow-cyan",
        green: "bg-[image:var(--gradient-green)] shadow-green",
        mustard: "bg-[image:var(--gradient-mustard)] shadow-mustard",
        ink: "bg-[image:var(--gradient-ink)] shadow-ink",
      },
    },
    defaultVariants: {
      tone: "violet",
    },
  },
);

function Progress({
  className,
  value,
  tone,
  size,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> &
  VariantProps<typeof progressVariants> &
  VariantProps<typeof indicatorVariants>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(progressVariants({ size, className }))}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(indicatorVariants({ tone }))}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress, progressVariants };
