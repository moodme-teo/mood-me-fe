import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * 흰 카드 — 테두리 대신 색조 그림자로 표면에서 떠오른다. tone 을 주면 그림자가
 * 해당 악센트 색을 띠고(시그니처 collage 모티프), 기본(none)은 중립 그림자.
 */
const cardVariants = cva(
  "flex flex-col gap-6 rounded-lg bg-card py-6 text-card-foreground transition-shadow duration-300 ease-standard",
  {
    variants: {
      tone: {
        none: "shadow-card hover:shadow-card-hover",
        pink: "shadow-pink hover:shadow-pink-hover",
        violet: "shadow-violet hover:shadow-violet-hover",
        cyan: "shadow-cyan hover:shadow-cyan-hover",
        green: "shadow-green hover:shadow-green-hover",
        mustard: "shadow-mustard hover:shadow-mustard-hover",
      },
    },
    defaultVariants: {
      tone: "none",
    },
  },
);

function Card({
  className,
  tone,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ tone, className }))}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 px-6", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-heading-md", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-body-sm", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
};
