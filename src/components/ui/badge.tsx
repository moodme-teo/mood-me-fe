import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

/** 밝은 팔레트 soft 그라디언트의 작은 pill 라벨. */
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-4 py-1.5 text-label uppercase tracking-wide whitespace-nowrap font-body [&_svg]:pointer-events-none [&_svg]:size-3.5",
  {
    variants: {
      tone: {
        pink: "bg-[image:var(--gradient-pink-soft)] text-[#7a1450]",
        violet: "bg-[image:var(--gradient-violet-soft)] text-[#3b1e8c]",
        cyan: "bg-[image:var(--gradient-cyan-soft)] text-[#075366]",
        green: "bg-[image:var(--gradient-green-soft)] text-[#255c0a]",
        mustard: "bg-[image:var(--gradient-mustard-soft)] text-[#7a4b00]",
        ink: "bg-[image:var(--gradient-ink)] text-white",
      },
    },
    defaultVariants: {
      tone: "violet",
    },
  },
);

function Badge({
  className,
  tone,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ tone, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
