import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * 테두리 없는 입력 — sunken fill 위에 놓이고, focus 시 아웃라인 대신 색조 그림자가
 * "떠오르며" 상태를 표시한다(translateY + shadow). tone 이 focus 그림자 색을 결정.
 */
const inputVariants = cva(
  "w-full rounded-md border-0 bg-surface-sunken text-foreground shadow-card outline-none transition-[box-shadow,transform] duration-200 ease-standard placeholder:text-muted-foreground focus:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      tone: {
        violet: "focus:shadow-violet",
        pink: "focus:shadow-pink",
        cyan: "focus:shadow-cyan",
        green: "focus:shadow-green",
        mustard: "focus:shadow-mustard",
        ink: "focus:shadow-ink",
      },
      inputSize: {
        lg: "px-5 py-4 text-body-lg",
        md: "px-[18px] py-[13px] text-body-md",
        sm: "px-3.5 py-[9px] text-body-sm",
      },
    },
    defaultVariants: {
      tone: "violet",
      inputSize: "md",
    },
  },
);

function Input({
  className,
  tone,
  inputSize,
  type,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ tone, inputSize, className }))}
      {...props}
    />
  );
}

export { Input, inputVariants };
