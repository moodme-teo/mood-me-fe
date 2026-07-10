"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * 확인 다이얼로그 — 모바일에서는 하단 시트, sm 이상에서는 가운데 카드로 뜬다.
 *
 * radix 를 감싸는 이유는 셋이다: 열림/닫힘 상태를 `data-state` 로 노출해 **사라질 때도**
 * 애니메이션을 태울 수 있고(직접 만들면 언마운트가 먼저라 exit 가 안 보인다), 포커스 트랩과
 * Escape 닫기를 공짜로 얻는다.
 *
 * 표면은 카드와 같은 규칙을 따른다 — 색조 그림자(shadow-card)와 radius-lg. 순수 검정
 * opacity 그림자는 쓰지 않는다 (DESIGN.md §4).
 *
 * 액션 버튼은 부르는 쪽이 children 으로 넣는다. 개수와 배치가 화면마다 다르기 때문이다.
 */
function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />;
}

type DialogContentProps = {
  title: string;
  /** 없으면 aria-describedby 를 붙이지 않는다 — 가리킬 대상이 없는 참조는 스크린리더가 버린다. */
  description?: string;
  children?: React.ReactNode;
  className?: string;
};

function DialogContent({
  title,
  description,
  children,
  className,
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-[100] bg-surface-inverse/48",
          "duration-200 ease-standard data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
          "motion-reduce:animate-none",
        )}
      />
      <DialogPrimitive.Content
        // radix 는 Description 의 id 를 aria-describedby 로 자동 연결한다. 설명이 없을 때만
        // 그 연결을 끊는다 — 조건 없이 넘기면 설명이 있어도 덮어써 버린다(Content 가 props 를
        // 기본값 뒤에 펼친다).
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "fixed inset-x-0 bottom-0 z-[100] mx-auto w-full max-w-sm p-4",
          "sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2",
          "duration-200 ease-standard data-[state=closed]:animate-out data-[state=open]:animate-in",
          // 모바일은 아래에서 올라오고, 데스크톱은 제자리에서 살짝 커진다.
          "data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4",
          "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
          "sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "motion-reduce:animate-none",
        )}
      >
        <div
          className={cn(
            "rounded-lg bg-card p-6 text-foreground shadow-card",
            className,
          )}
        >
          <DialogPrimitive.Title className="text-foreground text-heading-md">
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-2 text-muted-foreground text-body-sm">
              {description}
            </DialogPrimitive.Description>
          ) : null}
          {children ? <div className="mt-6">{children}</div> : null}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** 좌(취소)·우(진행) 두 개짜리 액션 줄. 버튼이 셋 이상이면 쓰지 않는다. */
function DialogActions({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2 [&>*]:flex-1">{children}</div>;
}

export { Dialog, DialogActions, DialogContent };
